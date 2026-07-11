namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a node in the hierarchical file plan (up to 5 levels).
/// </summary>
public class FilePlanEntry
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string ClassificationCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Level { get; set; }
    public int RetentionRuleId { get; set; }
    public string DisposalAuthorityRef { get; set; } = string.Empty;
    public int DefaultClassificationLevel { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeactivatedAt { get; set; }

    // Navigation properties
    public FilePlanEntry? Parent { get; set; }
    public ICollection<FilePlanEntry> Children { get; set; } = new List<FilePlanEntry>();
    public RetentionRule RetentionRule { get; set; } = null!;
    public ICollection<Record> Records { get; set; } = new List<Record>();
}
