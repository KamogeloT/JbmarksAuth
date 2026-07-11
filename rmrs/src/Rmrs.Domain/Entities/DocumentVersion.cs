namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a specific version of a document with checksum for integrity verification.
/// </summary>
public class DocumentVersion
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public int VersionNumber { get; set; }
    public int BitrixFileId { get; set; }
    public string Sha256Checksum { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedByUserId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Document Document { get; set; } = null!;
    public User UploadedByUser { get; set; } = null!;
}
