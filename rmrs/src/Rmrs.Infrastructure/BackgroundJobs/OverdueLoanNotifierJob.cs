using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.BackgroundJobs;

/// <summary>
/// Background job that runs daily at 08:00 to detect overdue physical record loans
/// and generate notifications for borrowers and Records_Managers.
/// 
/// Implements IHostedService with a timer-based schedule.
/// On each execution, identifies loans where:
///   - Status is "Active"
///   - ActualReturnDate is null
///   - ExpectedReturnDate is before today
/// 
/// For each overdue loan, creates an audit log entry as a notification record.
/// </summary>
public class OverdueLoanNotifierJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OverdueLoanNotifierJob> _logger;

    /// <summary>
    /// Target execution time: 08:00 UTC daily.
    /// </summary>
    private static readonly TimeOnly TargetTime = new(8, 0);

    public OverdueLoanNotifierJob(
        IServiceScopeFactory scopeFactory,
        ILogger<OverdueLoanNotifierJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OverdueLoanNotifierJob started. Scheduled to run daily at {TargetTime} UTC.", TargetTime);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = CalculateDelayUntilNextRun();
            _logger.LogDebug("OverdueLoanNotifierJob next run in {Delay}", delay);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                await ProcessOverdueLoansAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OverdueLoanNotifierJob encountered an error during execution.");
            }
        }

        _logger.LogInformation("OverdueLoanNotifierJob stopped.");
    }

    /// <summary>
    /// Calculates the delay until the next 08:00 UTC execution.
    /// </summary>
    private TimeSpan CalculateDelayUntilNextRun()
    {
        var now = DateTime.UtcNow;
        var todayTarget = new DateTime(now.Year, now.Month, now.Day, TargetTime.Hour, TargetTime.Minute, 0, DateTimeKind.Utc);

        if (now >= todayTarget)
        {
            // Already past today's target, schedule for tomorrow
            todayTarget = todayTarget.AddDays(1);
        }

        return todayTarget - now;
    }

    /// <summary>
    /// Processes all overdue loans: identifies them and generates notification entries.
    /// </summary>
    private async Task ProcessOverdueLoansAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OverdueLoanNotifierJob executing: checking for overdue loans...");

        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<RmrsDbContext>();

        var today = DateTime.UtcNow.Date;

        var overdueLoans = await dbContext.Loans
            .Include(l => l.PhysicalRecord)
                .ThenInclude(pr => pr.Record)
            .Include(l => l.BorrowerUser)
            .Where(l => l.Status == "Active"
                     && l.ActualReturnDate == null
                     && l.ExpectedReturnDate < today)
            .ToListAsync(stoppingToken);

        if (!overdueLoans.Any())
        {
            _logger.LogInformation("OverdueLoanNotifierJob: no overdue loans found.");
            return;
        }

        _logger.LogWarning(
            "OverdueLoanNotifierJob: found {OverdueCount} overdue loan(s). Generating notifications.",
            overdueLoans.Count);

        foreach (var loan in overdueLoans)
        {
            var daysOverdue = (today - loan.ExpectedReturnDate).Days;

            // Create an audit log entry as the notification mechanism
            var auditEntry = new Domain.Entities.AuditLog
            {
                UserId = loan.BorrowerUserId,
                Timestamp = DateTime.UtcNow,
                ActionType = "OverdueLoanNotification",
                EntityType = "Loan",
                EntityId = loan.Id,
                PreviousValue = null,
                NewValue = $"Overdue by {daysOverdue} day(s). Physical record: {loan.PhysicalRecord?.Record?.RegistryNumber ?? "N/A"}. " +
                           $"Borrower: {loan.BorrowerUser?.FullName ?? "Unknown"}. " +
                           $"Expected return: {loan.ExpectedReturnDate:yyyy-MM-dd}.",
                SourceIpAddress = "System:OverdueLoanNotifier"
            };

            dbContext.AuditLogs.Add(auditEntry);

            _logger.LogWarning(
                "Overdue loan notification generated: Loan {LoanId}, PhysicalRecord {PhysicalRecordId}, " +
                "Borrower {BorrowerName} ({BorrowerUserId}), {DaysOverdue} day(s) overdue.",
                loan.Id, loan.PhysicalRecordId,
                loan.BorrowerUser?.FullName ?? "Unknown", loan.BorrowerUserId,
                daysOverdue);
        }

        await dbContext.SaveChangesAsync(stoppingToken);

        _logger.LogInformation(
            "OverdueLoanNotifierJob completed: {NotificationCount} notification(s) generated.",
            overdueLoans.Count);
    }
}
