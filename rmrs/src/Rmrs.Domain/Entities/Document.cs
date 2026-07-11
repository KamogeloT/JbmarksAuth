namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents an electronic document linked to a record, stored in Bitrix.
/// </summary>
public class Document
{
    public int Id { get; set; }
    public int RecordId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public int CurrentVersion { get; set; } = 1;
    public int BitrixFileId { get; set; }
    public int BitrixFolderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Record Record { get; set; } = null!;
    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
}
