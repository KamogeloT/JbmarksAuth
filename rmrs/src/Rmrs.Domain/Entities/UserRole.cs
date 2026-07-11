namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a role assignment for a user with audit trail.
/// </summary>
public class UserRole
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public DateTime EffectiveDate { get; set; }
    public int AssignedByUserId { get; set; }
    public string Justification { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public User AssignedByUser { get; set; } = null!;
}
