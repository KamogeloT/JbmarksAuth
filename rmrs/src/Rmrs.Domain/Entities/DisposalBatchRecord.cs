namespace Rmrs.Domain.Entities;

/// <summary>
/// Join entity between DisposalBatch and Record.
/// </summary>
public class DisposalBatchRecord
{
    public int Id { get; set; }
    public int DisposalBatchId { get; set; }
    public int RecordId { get; set; }
    public string DisposalStatus { get; set; } = "Pending";

    // Navigation properties
    public DisposalBatch DisposalBatch { get; set; } = null!;
    public Record Record { get; set; } = null!;
}
