namespace Rmrs.Domain.Entities;

/// <summary>
/// Stores encrypted OAuth tokens for a user.
/// </summary>
public class UserToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public byte[] AccessTokenEncrypted { get; set; } = Array.Empty<byte>();
    public byte[] RefreshTokenEncrypted { get; set; } = Array.Empty<byte>();
    public DateTime AccessTokenExpiresAt { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User User { get; set; } = null!;
}
