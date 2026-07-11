namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a department mapped to a Bitrix workgroup drive.
/// </summary>
public class Department
{
    public int Id { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int BitrixWorkgroupId { get; set; }
    public int BitrixDriveId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Record> Records { get; set; } = new List<Record>();
}
