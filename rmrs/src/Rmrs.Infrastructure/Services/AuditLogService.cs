using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Append-only audit log service implementation.
/// Provides manual audit logging and query capabilities.
/// Never performs UPDATE or DELETE operations on audit entries.
/// Implements Requirements 11.1, 11.2, 11.3.
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<AuditLogService> _logger;

    /// <summary>
    /// Maximum allowed page size for queries to prevent excessive data loading.
    /// </summary>
    private const int MaxPageSize = 500;

    public AuditLogService(RmrsDbContext dbContext, ILogger<AuditLogService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task LogAsync(AuditEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        var auditLog = new AuditLog
        {
            UserId = entry.UserId,
            Timestamp = DateTime.UtcNow,
            ActionType = entry.ActionType,
            EntityType = entry.EntityType,
            EntityId = entry.EntityId,
            PreviousValue = entry.PreviousValue,
            NewValue = entry.NewValue,
            SourceIpAddress = entry.SourceIpAddress ?? "Unknown"
        };

        // Append-only: we only ever INSERT, never UPDATE or DELETE
        _dbContext.AuditLogs.Add(auditLog);
        await _dbContext.SaveChangesAsync();

        _logger.LogDebug(
            "Audit log entry created: {ActionType} on {EntityType}/{EntityId} by User {UserId}",
            entry.ActionType, entry.EntityType, entry.EntityId, entry.UserId);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AuditLog>> QueryAsync(AuditQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var queryable = BuildFilteredQuery(query);

        // Apply pagination with clamped page size
        var take = Math.Min(Math.Max(query.Take, 1), MaxPageSize);

        var results = await queryable
            .OrderByDescending(a => a.Timestamp)
            .Skip(query.Skip)
            .Take(take)
            .AsNoTracking()
            .ToListAsync();

        return results;
    }

    /// <inheritdoc />
    public async Task<int> GetCountAsync(AuditQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var queryable = BuildFilteredQuery(query);
        return await queryable.CountAsync();
    }

    /// <summary>
    /// Builds a filtered IQueryable based on the provided query parameters.
    /// </summary>
    private IQueryable<AuditLog> BuildFilteredQuery(AuditQuery query)
    {
        IQueryable<AuditLog> queryable = _dbContext.AuditLogs;

        if (query.UserId.HasValue)
        {
            queryable = queryable.Where(a => a.UserId == query.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            queryable = queryable.Where(a => a.EntityType == query.EntityType);
        }

        if (query.EntityId.HasValue)
        {
            queryable = queryable.Where(a => a.EntityId == query.EntityId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.ActionType))
        {
            queryable = queryable.Where(a => a.ActionType == query.ActionType);
        }

        if (query.FromDate.HasValue)
        {
            queryable = queryable.Where(a => a.Timestamp >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            queryable = queryable.Where(a => a.Timestamp <= query.ToDate.Value);
        }

        return queryable;
    }
}
