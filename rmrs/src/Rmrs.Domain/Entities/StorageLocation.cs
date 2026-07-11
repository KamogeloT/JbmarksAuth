namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a hierarchical storage location (Building/Floor/Room/Shelf/Position).
/// </summary>
public class StorageLocation
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string LocationType { get; set; } = string.Empty; // 'Building', 'Floor', 'Room', 'Shelf', 'Position'
    public string LocationName { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public StorageLocation? Parent { get; set; }
    public ICollection<StorageLocation> Children { get; set; } = new List<StorageLocation>();
}
