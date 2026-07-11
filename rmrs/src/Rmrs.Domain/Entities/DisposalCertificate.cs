namespace Rmrs.Domain.Entities;

/// <summary>
/// Stores generated disposal certificates as PDF binary data.
/// </summary>
public class DisposalCertificate
{
    public int Id { get; set; }
    public int DisposalBatchId { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public byte[] CertificateData { get; set; } = Array.Empty<byte>();

    // Navigation property
    public DisposalBatch DisposalBatch { get; set; } = null!;
}
