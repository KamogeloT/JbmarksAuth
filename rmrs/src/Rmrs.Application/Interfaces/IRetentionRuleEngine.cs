using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Utility for calculating retention-based dates and identifying disposal candidates.
/// Implements the core retention calculation logic: expiry = creation date + Y years + M months.
/// Modified retention rules apply only to records created after the modification date.
/// </summary>
public interface IRetentionRuleEngine
{
    /// <summary>
    /// Calculates the retention expiry date for a record based on the associated retention rule
    /// and the record's creation date.
    /// </summary>
    /// <param name="rule">The retention rule specifying years and months.</param>
    /// <param name="recordCreationDate">The date the record was created/registered.</param>
    /// <returns>The calculated expiry date.</returns>
    DateTime CalculateExpiryDate(RetentionRule rule, DateTime recordCreationDate);

    /// <summary>
    /// Gets all records that are candidates for disposal as of the specified date.
    /// A record is a disposal candidate if its retention expiry date is on or before the given date
    /// and its status is 'Active'.
    /// </summary>
    /// <param name="asOfDate">The reference date for calculating disposal eligibility.</param>
    /// <returns>A collection of records eligible for disposal.</returns>
    Task<IEnumerable<Record>> GetDisposalCandidatesAsync(DateTime asOfDate);
}
