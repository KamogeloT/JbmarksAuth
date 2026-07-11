using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service interface for managing retention rules.
/// Provides CRUD operations for retention rules used in file plan entries.
/// </summary>
public interface IRetentionRuleService
{
    /// <summary>
    /// Gets all active retention rules.
    /// </summary>
    /// <returns>A collection of active retention rules.</returns>
    Task<IEnumerable<RetentionRule>> GetAllAsync();

    /// <summary>
    /// Gets a retention rule by its ID.
    /// </summary>
    /// <param name="id">The retention rule ID.</param>
    /// <returns>The retention rule, or null if not found.</returns>
    Task<RetentionRule?> GetByIdAsync(int id);

    /// <summary>
    /// Creates a new retention rule.
    /// </summary>
    /// <param name="ruleName">Name of the retention rule.</param>
    /// <param name="retentionYears">Number of years to retain.</param>
    /// <param name="retentionMonths">Number of additional months to retain.</param>
    /// <param name="disposalAction">Disposal action: 'Destroy', 'Archive', or 'Review'.</param>
    /// <param name="description">Optional description of the rule.</param>
    /// <returns>The created retention rule.</returns>
    Task<RetentionRule> CreateAsync(
        string ruleName,
        int retentionYears,
        int retentionMonths,
        string disposalAction,
        string? description);

    /// <summary>
    /// Updates an existing retention rule.
    /// Modified rules apply only to records created after the modification date.
    /// </summary>
    /// <param name="id">The retention rule ID to update.</param>
    /// <param name="ruleName">Updated rule name.</param>
    /// <param name="retentionYears">Updated retention years.</param>
    /// <param name="retentionMonths">Updated retention months.</param>
    /// <param name="disposalAction">Updated disposal action.</param>
    /// <param name="description">Updated description.</param>
    /// <returns>The updated retention rule.</returns>
    Task<RetentionRule> UpdateAsync(
        int id,
        string ruleName,
        int retentionYears,
        int retentionMonths,
        string disposalAction,
        string? description);
}
