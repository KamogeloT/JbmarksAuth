using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Computes compliance dashboard metrics and generates compliance reports.
/// Implements Requirements 11.4, 11.5, 11.6.
/// </summary>
public class ComplianceDashboardService : IComplianceDashboardService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<ComplianceDashboardService> _logger;

    /// <summary>
    /// Number of days past retention expiry before a disposal is considered overdue.
    /// </summary>
    private const int OverdueDaysThreshold = 30;

    /// <summary>
    /// Number of days before retention expiry to consider a record as "approaching expiry".
    /// </summary>
    private const int ApproachingExpiryDays = 90;

    public ComplianceDashboardService(RmrsDbContext dbContext, ILogger<ComplianceDashboardService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ComplianceMetrics> GetComplianceMetricsAsync()
    {
        var now = DateTime.UtcNow;
        var overdueThreshold = now.AddDays(-OverdueDaysThreshold);
        var approachingExpiryDate = now.AddDays(ApproachingExpiryDays);

        _logger.LogDebug("Computing compliance metrics as of {Timestamp}", now);

        // Pending disposals: records with retention expiry <= now and still Active
        var pendingDisposals = await _dbContext.Records
            .CountAsync(r => r.Status == "Active"
                && r.RetentionExpiryDate != null
                && r.RetentionExpiryDate <= now);

        // Overdue disposals: records where retention expired more than 30 days ago and still Active
        var overdueDisposals = await _dbContext.Records
            .CountAsync(r => r.Status == "Active"
                && r.RetentionExpiryDate != null
                && r.RetentionExpiryDate <= overdueThreshold);

        // Records approaching retention expiry: retention expires within next 90 days
        var approachingExpiry = await _dbContext.Records
            .CountAsync(r => r.Status == "Active"
                && r.RetentionExpiryDate != null
                && r.RetentionExpiryDate > now
                && r.RetentionExpiryDate <= approachingExpiryDate);

        // File plan coverage: percentage of active records classified under an active file plan entry
        var totalActiveRecords = await _dbContext.Records
            .CountAsync(r => r.Status == "Active");

        double filePlanCoverage = 0.0;
        if (totalActiveRecords > 0)
        {
            var recordsWithActiveFilePlan = await _dbContext.Records
                .CountAsync(r => r.Status == "Active"
                    && r.FilePlanEntry.IsActive);

            filePlanCoverage = Math.Round((double)recordsWithActiveFilePlan / totalActiveRecords * 100, 2);
        }

        var metrics = new ComplianceMetrics
        {
            PendingDisposals = pendingDisposals,
            OverdueDisposals = overdueDisposals,
            RecordsApproachingRetentionExpiry = approachingExpiry,
            FilePlanCoveragePercentage = filePlanCoverage,
            ComputedAt = now
        };

        _logger.LogDebug(
            "Compliance metrics computed: PendingDisposals={Pending}, OverdueDisposals={Overdue}, ApproachingExpiry={Approaching}, FilePlanCoverage={Coverage}%",
            metrics.PendingDisposals, metrics.OverdueDisposals,
            metrics.RecordsApproachingRetentionExpiry, metrics.FilePlanCoveragePercentage);

        return metrics;
    }

    /// <inheritdoc />
    public async Task<ComplianceReport> GenerateComplianceReportAsync(ComplianceReportRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        _logger.LogInformation(
            "Generating compliance report for period {FromDate} to {ToDate}",
            request.FromDate, request.ToDate);

        var fromDate = request.FromDate;
        var toDate = request.ToDate;

        // Records created during the period
        var totalRecordsCreated = await _dbContext.Records
            .CountAsync(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate);

        // Records disposed during the period (records in executed disposal batches)
        var totalRecordsDisposed = await _dbContext.DisposalBatchRecords
            .CountAsync(dbr => dbr.DisposalBatch.Status == "Executed"
                && dbr.DisposalBatch.ExecutedAt != null
                && dbr.DisposalBatch.ExecutedAt >= fromDate
                && dbr.DisposalBatch.ExecutedAt <= toDate);

        // Records archived during the period
        var totalRecordsArchived = await _dbContext.Records
            .CountAsync(r => r.Status == "Archived"
                && r.UpdatedAt >= fromDate
                && r.UpdatedAt <= toDate);

        // Disposal batches processed during the period
        var disposalBatchesProcessed = await _dbContext.DisposalBatches
            .CountAsync(db => db.Status == "Executed"
                && db.ExecutedAt != null
                && db.ExecutedAt >= fromDate
                && db.ExecutedAt <= toDate);

        // Audit activity summary for the period
        var auditActivity = await ComputeAuditActivityAsync(fromDate, toDate);

        // Current compliance metrics
        var currentMetrics = await GetComplianceMetricsAsync();

        var report = new ComplianceReport
        {
            FromDate = fromDate,
            ToDate = toDate,
            GeneratedAt = DateTime.UtcNow,
            TotalRecordsCreated = totalRecordsCreated,
            TotalRecordsDisposed = totalRecordsDisposed,
            TotalRecordsArchived = totalRecordsArchived,
            DisposalBatchesProcessed = disposalBatchesProcessed,
            CurrentMetrics = currentMetrics,
            AuditActivity = auditActivity
        };

        _logger.LogInformation(
            "Compliance report generated: ReportId={ReportId}, RecordsCreated={Created}, RecordsDisposed={Disposed}",
            report.ReportId, report.TotalRecordsCreated, report.TotalRecordsDisposed);

        return report;
    }

    /// <summary>
    /// Computes audit activity summary for a given date range.
    /// </summary>
    private async Task<AuditActivitySummary> ComputeAuditActivityAsync(DateTime fromDate, DateTime toDate)
    {
        var auditLogs = _dbContext.AuditLogs
            .Where(a => a.Timestamp >= fromDate && a.Timestamp <= toDate);

        var totalEntries = await auditLogs.CountAsync();

        var createOps = await auditLogs.CountAsync(a => a.ActionType == "Create");
        var updateOps = await auditLogs.CountAsync(a => a.ActionType == "Update");
        var deleteOps = await auditLogs.CountAsync(a => a.ActionType == "Delete");
        var readOps = await auditLogs.CountAsync(a => a.ActionType == "Read");

        return new AuditActivitySummary
        {
            TotalEntries = totalEntries,
            CreateOperations = createOps,
            UpdateOperations = updateOps,
            DeleteOperations = deleteOps,
            ReadOperations = readOps
        };
    }
}
