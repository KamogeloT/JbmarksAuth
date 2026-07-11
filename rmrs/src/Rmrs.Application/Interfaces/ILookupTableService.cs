using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing lookup tables (record types, classification levels,
/// storage locations, departments, disposal authority references).
/// Implements Requirements 13.2.
/// </summary>
public interface ILookupTableService
{
    /// <summary>
    /// Gets all lookup values for a specified type.
    /// </summary>
    /// <param name="lookupType">The lookup type (e.g., "RecordType", "ClassificationLevel").</param>
    /// <returns>A collection of lookup values for the specified type.</returns>
    Task<IEnumerable<LookupValueDto>> GetByTypeAsync(string lookupType);

    /// <summary>
    /// Gets a single lookup value by type and code.
    /// </summary>
    /// <param name="lookupType">The lookup type.</param>
    /// <param name="code">The value code.</param>
    /// <returns>The lookup value, or null if not found.</returns>
    Task<LookupValueDto?> GetByTypeAndCodeAsync(string lookupType, string code);

    /// <summary>
    /// Creates a new lookup value for the specified type.
    /// </summary>
    /// <param name="request">The create request.</param>
    /// <returns>The created lookup value.</returns>
    Task<LookupValueDto> CreateAsync(CreateLookupValueRequest request);

    /// <summary>
    /// Updates an existing lookup value.
    /// </summary>
    /// <param name="lookupType">The lookup type.</param>
    /// <param name="code">The value code to update.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated lookup value.</returns>
    Task<LookupValueDto> UpdateAsync(string lookupType, string code, UpdateLookupValueRequest request);

    /// <summary>
    /// Gets all valid lookup types.
    /// </summary>
    /// <returns>A collection of valid lookup type names.</returns>
    IEnumerable<string> GetValidLookupTypes();
}

/// <summary>
/// DTO representing a lookup value.
/// </summary>
public class LookupValueDto
{
    public int Id { get; set; }
    public string LookupType { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Request to create a new lookup value.
/// </summary>
public class CreateLookupValueRequest
{
    /// <summary>The lookup type this value belongs to.</summary>
    public string LookupType { get; set; } = string.Empty;

    /// <summary>The unique code for this value within the type.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>The display name shown to users.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Sort order for display purposes.</summary>
    public int SortOrder { get; set; }

    /// <summary>Whether this value is active.</summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Request to update an existing lookup value.
/// </summary>
public class UpdateLookupValueRequest
{
    /// <summary>Updated display name (optional).</summary>
    public string? DisplayName { get; set; }

    /// <summary>Updated sort order (optional).</summary>
    public int? SortOrder { get; set; }

    /// <summary>Updated active status (optional).</summary>
    public bool? IsActive { get; set; }
}
