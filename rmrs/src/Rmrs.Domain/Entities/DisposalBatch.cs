namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a batch of records being disposed according to disposal authority.
/// </summary>
public class DisposalBatch
{
    public int Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public string DisposalAuthorityRef { get; set; } = string.Empty;
    public string Status { get; set; } = "Initiated"; // 'Initiated', 'Approved', 'Executed'
    public int InitiatedByUserId { get; set; }
    public int? ApprovedByUserId { get; set; }
    public DateTime InitiatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public bool CertificateGenerated { get; set; }

    // Navigation properties
    public User InitiatedByUser { get; set; } = null!;
    public User? ApprovedByUser { get; set; }
    public ICollection<DisposalBatchRecord> DisposalBatchRecords { get; set; } = new List<DisposalBatchRecord>();
    public DisposalCertificate? Certificate { get; set; }
}
