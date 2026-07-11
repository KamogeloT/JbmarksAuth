namespace Rmrs.Domain.Entities;

/// <summary>
/// Join entity between TransferBatch and Record with validation status.
/// </summary>
public class TransferBatchRecord
{
    public int Id { get; set; }
    public int TransferBatchId { get; set; }
    public int RecordId { get; set; }
    public string ValidationStatus { get; set; } = "Pending";
    public string? ValidationErrors { get; set; }

    // Navigation properties
    public TransferBatch TransferBatch { get; set; } = null!;
    public Record Record { get; set; } = null!;
}
