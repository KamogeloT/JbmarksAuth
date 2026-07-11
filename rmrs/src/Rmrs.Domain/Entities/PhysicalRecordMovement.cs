namespace Rmrs.Domain.Entities;

/// <summary>
/// Records the movement of a physical record between storage locations.
/// </summary>
public class PhysicalRecordMovement
{
    public int Id { get; set; }
    public int PhysicalRecordId { get; set; }
    public int? FromLocationId { get; set; }
    public int ToLocationId { get; set; }
    public int MovedByUserId { get; set; }
    public DateTime MovedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public PhysicalRecord PhysicalRecord { get; set; } = null!;
    public StorageLocation? FromLocation { get; set; }
    public StorageLocation ToLocation { get; set; } = null!;
    public User MovedByUser { get; set; } = null!;
}
