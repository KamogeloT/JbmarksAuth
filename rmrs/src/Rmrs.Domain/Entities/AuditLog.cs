namespace Rmrs.Domain.Entities;

/// <summary>
/// Immutable audit log entry. This table is append-only (UPDATE/DELETE denied).
/// </summary>
public class AuditLog
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string? PreviousValue { get; set; }
    public string? NewValue { get; set; }
    public string SourceIpAddress { get; set; } = string.Empty;
}
