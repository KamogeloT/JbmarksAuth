namespace Rmrs.Domain.Entities;

/// <summary>
/// Stores system configuration key-value pairs.
/// </summary>
public class SystemConfiguration
{
    public int Id { get; set; }
    public string ConfigKey { get; set; } = string.Empty;
    public string ConfigValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? UpdatedByUserId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User? UpdatedByUser { get; set; }
}
