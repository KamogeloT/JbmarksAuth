using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Provides CRUD operations for retention rules.
/// Modified retention rules apply only to records created after the modification date.
/// </summary>
public class RetentionRuleService : IRetentionRuleService
{
    private static readonly string[] ValidDisposalActions = { "Destroy", "Archive", "Review" };

    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<RetentionRuleService> _logger;

    public RetentionRuleService(
        RmrsDbContext dbContext,
        ILogger<RetentionRuleService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<RetentionRule>> GetAllAsync()
    {
        return await _dbContext.RetentionRules
            .AsNoTracking()
            .Where(r => r.IsActive)
            .OrderBy(r => r.RuleName)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<RetentionRule?> GetByIdAsync(int id)
    {
        return await _dbContext.RetentionRules
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    /// <inheritdoc />
    public async Task<RetentionRule> CreateAsync(
        string ruleName,
        int retentionYears,
        int retentionMonths,
        string disposalAction,
        string? description)
    {
        ValidateRetentionRule(ruleName, retentionYears, retentionMonths, disposalAction);

        var rule = new RetentionRule
        {
            RuleName = ruleName.Trim(),
            RetentionYears = retentionYears,
            RetentionMonths = retentionMonths,
            DisposalAction = disposalAction.Trim(),
            Description = description?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.RetentionRules.Add(rule);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Created retention rule: {RuleName} (ID {RuleId}) - {Years}y {Months}m, action: {Action}",
            rule.RuleName, rule.Id, rule.RetentionYears, rule.RetentionMonths, rule.DisposalAction);

        return rule;
    }

    /// <inheritdoc />
    public async Task<RetentionRule> UpdateAsync(
        int id,
        string ruleName,
        int retentionYears,
        int retentionMonths,
        string disposalAction,
        string? description)
    {
        var rule = await _dbContext.RetentionRules
            .FirstOrDefaultAsync(r => r.Id == id);

        if (rule == null)
            throw new NotFoundException("RetentionRule", id);

        if (!rule.IsActive)
            throw new ValidationException("Cannot update an inactive retention rule.");

        ValidateRetentionRule(ruleName, retentionYears, retentionMonths, disposalAction);

        rule.RuleName = ruleName.Trim();
        rule.RetentionYears = retentionYears;
        rule.RetentionMonths = retentionMonths;
        rule.DisposalAction = disposalAction.Trim();
        rule.Description = description?.Trim();

        // Note: Modified retention rules apply only to records created after modification.
        // The CreatedAt timestamp on the rule remains unchanged; records created after this point
        // use the updated values. Existing records retain their already-calculated expiry dates.

        _dbContext.RetentionRules.Update(rule);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Updated retention rule: {RuleName} (ID {RuleId}) - {Years}y {Months}m, action: {Action}",
            rule.RuleName, rule.Id, rule.RetentionYears, rule.RetentionMonths, rule.DisposalAction);

        return rule;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ────────────────────────────────────────────────────────────────────────

    private static void ValidateRetentionRule(
        string ruleName, int retentionYears, int retentionMonths, string disposalAction)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(ruleName))
            errors.Add("Rule name is required.");

        if (retentionYears < 0)
            errors.Add("Retention years must be zero or positive.");

        if (retentionMonths < 0)
            errors.Add("Retention months must be zero or positive.");

        if (retentionYears == 0 && retentionMonths == 0)
            errors.Add("At least one of retention years or months must be greater than zero.");

        if (string.IsNullOrWhiteSpace(disposalAction))
            errors.Add("Disposal action is required.");
        else if (!ValidDisposalActions.Contains(disposalAction.Trim(), StringComparer.OrdinalIgnoreCase))
            errors.Add($"Disposal action must be one of: {string.Join(", ", ValidDisposalActions)}.");

        if (errors.Count > 0)
        {
            throw new ValidationException(
                "Retention rule validation failed.",
                string.Join(" ", errors));
        }
    }
}
