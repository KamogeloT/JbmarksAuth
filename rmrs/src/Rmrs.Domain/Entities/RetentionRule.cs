namespace Rmrs.Domain.Entities;

/// <summary>
/// Defines how long a record category must be retained before disposal or transfer.
/// </summary>
public class RetentionRule
{
    public int Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public int RetentionYears { get; set; }
    public int RetentionMonths { get; set; }
    public string DisposalAction { get; set; } = string.Empty; // 'Destroy', 'Archive', 'Review'
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<FilePlanEntry> FilePlanEntries { get; set; } = new List<FilePlanEntry>();
}
