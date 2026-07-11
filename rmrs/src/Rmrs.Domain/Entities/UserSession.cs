namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents an active user session with sliding expiration.
/// </summary>
public class UserSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int UserId { get; set; }
    public string SessionToken { get; set; } = string.Empty;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public string? IpAddress { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation property
    public User User { get; set; } = null!;
}
