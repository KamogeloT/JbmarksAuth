using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing storage location hierarchy and physical record movements.
/// Handles CRUD for locations and records movement/bulk-move operations.
/// </summary>
public interface ILocationService
{
    /// <summary>
    /// Gets the current storage location for a physical record.
    /// </summary>
    /// <param name="physicalRecordId">The physical record ID.</param>
    /// <returns>The current storage location, or null if not assigned.</returns>
    Task<StorageLocation?> GetCurrentLocationAsync(int physicalRecordId);

    /// <summary>
    /// Moves a physical record to a new storage location, recording the movement history.
    /// </summary>
    /// <param name="physicalRecordId">The physical record ID.</param>
    /// <param name="newLocationId">The destination storage location ID.</param>
    /// <param name="userId">The user performing the move.</param>
    Task MoveRecordAsync(int physicalRecordId, int newLocationId, int userId);

    /// <summary>
    /// Gets the complete movement history for a physical record.
    /// </summary>
    /// <param name="physicalRecordId">The physical record ID.</param>
    /// <returns>List of movement records ordered by date descending.</returns>
    Task<IEnumerable<PhysicalRecordMovement>> GetMovementHistoryAsync(int physicalRecordId);

    /// <summary>
    /// Moves multiple physical records to the same location in a single operation.
    /// Used for bulk barcode scan operations.
    /// </summary>
    /// <param name="physicalRecordIds">The physical record IDs to move.</param>
    /// <param name="newLocationId">The destination storage location ID.</param>
    /// <param name="userId">The user performing the bulk move.</param>
    Task BulkMoveAsync(IEnumerable<int> physicalRecordIds, int newLocationId, int userId);

    /// <summary>
    /// Gets all storage locations as a hierarchical tree.
    /// </summary>
    /// <returns>List of top-level storage locations with children populated.</returns>
    Task<IEnumerable<StorageLocation>> GetLocationTreeAsync();

    /// <summary>
    /// Creates a new storage location in the hierarchy.
    /// </summary>
    /// <param name="parentId">The parent location ID (null for top-level).</param>
    /// <param name="locationType">The type: Building, Floor, Room, Shelf, or Position.</param>
    /// <param name="locationName">Human-readable name.</param>
    /// <param name="locationCode">Unique code identifier.</param>
    /// <returns>The created storage location.</returns>
    Task<StorageLocation> CreateLocationAsync(int? parentId, string locationType, string locationName, string locationCode);

    /// <summary>
    /// Updates an existing storage location.
    /// </summary>
    /// <param name="id">The storage location ID.</param>
    /// <param name="locationName">Updated name.</param>
    /// <param name="isActive">Whether the location is active.</param>
    /// <returns>The updated storage location.</returns>
    Task<StorageLocation> UpdateLocationAsync(int id, string locationName, bool isActive);

    /// <summary>
    /// Gets a storage location by its ID.
    /// </summary>
    /// <param name="id">The storage location ID.</param>
    /// <returns>The storage location or null if not found.</returns>
    Task<StorageLocation?> GetLocationByIdAsync(int id);
}
