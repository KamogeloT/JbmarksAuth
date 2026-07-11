using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for manual audit log writing and querying.
/// Provides append-only write operations and filtered query capabilities.
/// Implements Requirements 11.1, 11.2, 11.3.
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Manually writes an audit log entry for actions not captured by the EF Core interceptor.
    /// This is append-only — entries can never be updated or deleted.
    /// </summary>
    /// <param name="entry">The audit entry to persist.</param>
    Task LogAsync(AuditEntry entry);

    /// <summary>
    /// Queries audit logs with optional filters and pagination.
    /// </summary>
    /// <param name="query">The query filters and pagination parameters.</param>
    /// <returns>A collection of matching audit log entries.</returns>
    Task<IEnumerable<AuditLog>> QueryAsync(AuditQuery query);

    /// <summary>
    /// Gets the total count of audit logs matching the specified filters (for pagination).
    /// </summary>
    /// <param name="query">The query filters.</param>
    /// <returns>The number of matching entries.</returns>
    Task<int> GetCountAsync(AuditQuery query);
}

/// <summary>
/// Represents an audit entry to be manually logged.
/// Used for operations not automatically captured by the EF Core interceptor
/// (e.g., read operations, custom business events, login/logout).
/// </summary>
public record AuditEntry(
    int UserId,
    string ActionType,
    string EntityType,
    int EntityId,
    string? PreviousValue = null,
    string? NewValue = null,
    string? SourceIpAddress = null
);

/// <summary>
/// Query parameters for filtering and paginating audit log results.
/// </summary>
public class AuditQuery
{
    /// <summary>
    /// Filter by the user who performed the action.
    /// </summary>
    public int? UserId { get; set; }

    /// <summary>
    /// Filter by entity type (e.g., "Record", "FilePlanEntry", "Document").
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// Filter by the specific entity ID.
    /// </summary>
    public int? EntityId { get; set; }

    /// <summary>
    /// Filter by action type (e.g., "Create", "Update", "Delete", "Read").
    /// </summary>
    public string? ActionType { get; set; }

    /// <summary>
    /// Filter entries from this date/time onwards (inclusive).
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// Filter entries up to this date/time (inclusive).
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// Number of records to skip for pagination. Default is 0.
    /// </summary>
    public int Skip { get; set; } = 0;

    /// <summary>
    /// Maximum number of records to return. Default is 50, maximum is 500.
    /// </summary>
    public int Take { get; set; } = 50;
}
