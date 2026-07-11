using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service interface for managing the hierarchical file plan.
/// Provides tree retrieval, CRUD operations, deactivation logic, and validation.
/// The file plan supports up to 5 levels of hierarchy.
/// </summary>
public interface IFilePlanService
{
    /// <summary>
    /// Creates a new file plan entry in the tree hierarchy.
    /// Validates required fields, unique classification code, and depth constraint (max 5 levels).
    /// </summary>
    /// <param name="parentId">Optional parent entry ID (null for root-level entries).</param>
    /// <param name="classificationCode">Unique classification code for the entry.</param>
    /// <param name="title">Title of the file plan entry.</param>
    /// <param name="description">Description of the file plan entry.</param>
    /// <param name="retentionRuleId">ID of the retention rule to associate.</param>
    /// <param name="disposalAuthorityRef">Disposal authority reference.</param>
    /// <param name="defaultClassificationLevel">Default classification level for records created under this entry.</param>
    /// <returns>The created file plan entry.</returns>
    Task<FilePlanEntry> CreateEntryAsync(
        int? parentId,
        string classificationCode,
        string title,
        string description,
        int retentionRuleId,
        string disposalAuthorityRef,
        int defaultClassificationLevel);

    /// <summary>
    /// Updates an existing file plan entry.
    /// Classification code uniqueness is validated if changed.
    /// </summary>
    /// <param name="id">The ID of the entry to update.</param>
    /// <param name="title">Updated title.</param>
    /// <param name="description">Updated description.</param>
    /// <param name="retentionRuleId">Updated retention rule ID.</param>
    /// <param name="disposalAuthorityRef">Updated disposal authority reference.</param>
    /// <param name="defaultClassificationLevel">Updated default classification level.</param>
    /// <returns>The updated file plan entry.</returns>
    Task<FilePlanEntry> UpdateEntryAsync(
        int id,
        string title,
        string description,
        int retentionRuleId,
        string disposalAuthorityRef,
        int defaultClassificationLevel);

    /// <summary>
    /// Deactivates a file plan entry. Prevents new records from being classified under it
    /// while retaining access to existing records. Entries with active records cannot be deleted,
    /// only deactivated.
    /// </summary>
    /// <param name="id">The ID of the entry to deactivate.</param>
    Task DeactivateEntryAsync(int id);

    /// <summary>
    /// Returns the full hierarchical tree structure of all active file plan entries.
    /// </summary>
    /// <returns>A list of root-level entries with populated Children collections.</returns>
    Task<IEnumerable<FilePlanEntry>> GetTreeAsync();

    /// <summary>
    /// Returns a single file plan entry by its ID.
    /// </summary>
    /// <param name="id">The entry ID.</param>
    /// <returns>The file plan entry, or null if not found.</returns>
    Task<FilePlanEntry?> GetEntryByIdAsync(int id);

    /// <summary>
    /// Returns the direct children of a file plan entry.
    /// </summary>
    /// <param name="parentId">The parent entry ID.</param>
    /// <returns>List of child entries.</returns>
    Task<IEnumerable<FilePlanEntry>> GetChildrenAsync(int parentId);

    /// <summary>
    /// Checks whether a file plan entry has any active records classified under it.
    /// </summary>
    /// <param name="entryId">The file plan entry ID to check.</param>
    /// <returns>True if active records exist under this entry.</returns>
    Task<bool> HasActiveRecordsAsync(int entryId);
}
