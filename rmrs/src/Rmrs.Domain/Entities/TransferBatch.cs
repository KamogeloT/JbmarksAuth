namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a batch of records being transferred to the National Archives.
/// </summary>
public class TransferBatch
{
    public int Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public string DestinationArchive { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // 'Draft', 'Validated', 'Finalized', 'Completed'
    public int CreatedByUserId { get; set; }
    public DateTime? FinalizedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ArchiveReferenceNumber { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User CreatedByUser { get; set; } = null!;
    public ICollection<TransferBatchRecord> TransferBatchRecords { get; set; } = new List<TransferBatchRecord>();
}
