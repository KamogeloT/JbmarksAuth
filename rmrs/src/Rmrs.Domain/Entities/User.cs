namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a system user synced from Bitrix.
/// </summary>
public class User
{
    public int Id { get; set; }
    public int BitrixUserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? DepartmentCode { get; set; }
    public int MaxClassificationLevel { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<UserToken> UserTokens { get; set; } = new List<UserToken>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
}
