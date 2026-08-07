using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service interface for managing department-to-Bitrix workgroup drive mappings.
/// Provides CRUD operations with business logic validation including Bitrix API verification.
/// All mappings are stored in the database and fully configurable at runtime.
/// </summary>
public interface IDepartmentMappingService
{
    /// <summary>
    /// Creates a new department mapping after validating that the Bitrix workgroup exists.
    /// </summary>
    /// <param name="departmentCode">Unique department code identifier.</param>
    /// <param name="departmentName">Human-readable department name.</param>
    /// <param name="bitrixWorkgroupId">The Bitrix workgroup ID to map to.</param>
    /// <param name="bitrixDriveId">The Bitrix drive ID associated with the workgroup.</param>
    /// <returns>The created department entity.</returns>
    Task<Department> CreateMappingAsync(string departmentCode, string departmentName, int bitrixWorkgroupId, int bitrixDriveId);

    /// <summary>
    /// Updates an existing department mapping. If the Bitrix workgroup ID changes,
    /// validates the new workgroup exists via Bitrix API.
    /// </summary>
    /// <param name="id">The department mapping ID to update.</param>
    /// <param name="departmentName">Updated department name.</param>
    /// <param name="bitrixWorkgroupId">Updated Bitrix workgroup ID.</param>
    /// <param name="bitrixDriveId">Updated Bitrix drive ID.</param>
    /// <returns>The updated department entity.</returns>
    Task<Department> UpdateMappingAsync(int id, string departmentName, int bitrixWorkgroupId, int bitrixDriveId);

    /// <summary>
    /// Deletes a department mapping. Blocked if the department has associated records.
    /// </summary>
    /// <param name="id">The department mapping ID to delete.</param>
    /// <returns>True if deletion succeeded.</returns>
    Task<bool> DeleteMappingAsync(int id);

    /// <summary>
    /// Returns all department mappings (active and inactive).
    /// </summary>
    Task<IEnumerable<Department>> GetAllMappingsAsync();

    /// <summary>
    /// Returns a specific department mapping by its ID.
    /// </summary>
    /// <param name="id">The department mapping ID.</param>
    /// <returns>The department entity, or null if not found.</returns>
    Task<Department?> GetMappingByIdAsync(int id);

    /// <summary>
    /// Returns a specific department mapping by its department code.
    /// </summary>
    /// <param name="departmentCode">The department code to look up.</param>
    /// <returns>The department entity, or null if not found.</returns>
    Task<Department?> GetMappingByDepartmentCodeAsync(string departmentCode);

    /// <summary>
    /// Validates that a Bitrix workgroup exists by calling the Bitrix REST API (sonet_group.get).
    /// </summary>
    /// <param name="workgroupId">The Bitrix workgroup ID to validate.</param>
    /// <returns>True if the workgroup exists on the Bitrix platform.</returns>
    Task<bool> ValidateWorkgroupAsync(int workgroupId);

    /// <summary>
    /// Syncs departments from Bitrix workgroups. Fetches all workgroups and creates
    /// department mappings for any that don't already exist in the database.
    /// </summary>
    /// <returns>Summary of sync results (created, skipped, total).</returns>
    Task<SyncFromBitrixResult> SyncFromBitrixAsync();
}

/// <summary>
/// Result of a Bitrix workgroup sync operation.
/// </summary>
public class SyncFromBitrixResult
{
    public int TotalWorkgroups { get; set; }
    public int Created { get; set; }
    public int Skipped { get; set; }
    public List<string> CreatedDepartments { get; set; } = new();
    public List<string> SkippedDepartments { get; set; } = new();
}
