using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Calculates retention expiry dates and identifies disposal candidates.
/// The core formula: expiryDate = recordCreationDate + retentionYears + retentionMonths.
/// Modified retention rules apply only to records created after the modification date.
/// </summary>
public class RetentionRuleEngine : IRetentionRuleEngine
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<RetentionRuleEngine> _logger;

    public RetentionRuleEngine(
        RmrsDbContext dbContext,
        ILogger<RetentionRuleEngine> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public DateTime CalculateExpiryDate(RetentionRule rule, DateTime recordCreationDate)
    {
        if (rule == null)
            throw new ArgumentNullException(nameof(rule));

        return recordCreationDate
            .AddYears(rule.RetentionYears)
            .AddMonths(rule.RetentionMonths);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Record>> GetDisposalCandidatesAsync(DateTime asOfDate)
    {
        var candidates = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .Where(r =>
                r.Status == "Active" &&
                r.RetentionExpiryDate != null &&
                r.RetentionExpiryDate.Value <= asOfDate)
            .OrderBy(r => r.RetentionExpiryDate)
            .ToListAsync();

        _logger.LogInformation(
            "Identified {Count} disposal candidates as of {AsOfDate}",
            candidates.Count, asOfDate);

        return candidates;
    }
}
