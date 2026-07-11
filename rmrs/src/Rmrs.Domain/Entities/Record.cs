namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a registered record in the registry system.
/// </summary>
public class Record
{
    public int Id { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty; // 'Incoming', 'Outgoing', 'Internal'
    public string Subject { get; set; } = string.Empty;
    public string? SenderOrRecipient { get; set; }
    public DateTime DateReceivedOrSent { get; set; }
    public int FilePlanEntryId { get; set; }
    public int ClassificationLevel { get; set; }
    public int ResponsibleOfficerId { get; set; }
    public int DepartmentId { get; set; }
    public string? ExternalReferenceNumber { get; set; }
    public string? OriginatingOrganization { get; set; }
    public DateTime? CorrespondenceDate { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime? RetentionExpiryDate { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public FilePlanEntry FilePlanEntry { get; set; } = null!;
    public User ResponsibleOfficer { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public PhysicalRecord? PhysicalRecord { get; set; }
}
