using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence;

/// <summary>
/// EF Core interceptor that automatically creates audit log entries
/// for all entity create, update, and delete operations.
/// Captures the current user ID and source IP address from the HTTP context.
/// Implements Requirements 11.1, 11.2, 11.3.
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ILogger<AuditSaveChangesInterceptor> _logger;
    private readonly IUserContext _userContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditSaveChangesInterceptor(
        ILogger<AuditSaveChangesInterceptor> logger,
        IUserContext userContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _userContext = userContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is null)
            return base.SavingChangesAsync(eventData, result, cancellationToken);

        var context = eventData.Context;
        var auditEntries = CreateAuditEntries(context);

        if (auditEntries.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditEntries);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (eventData.Context is null)
            return base.SavingChanges(eventData, result);

        var context = eventData.Context;
        var auditEntries = CreateAuditEntries(context);

        if (auditEntries.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditEntries);
        }

        return base.SavingChanges(eventData, result);
    }

    private List<AuditLog> CreateAuditEntries(DbContext context)
    {
        var auditEntries = new List<AuditLog>();
        var timestamp = DateTime.UtcNow;
        var currentUserId = GetCurrentUserId();
        var sourceIpAddress = GetSourceIpAddress();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            // Skip audit logs themselves to avoid infinite recursion
            if (entry.Entity is AuditLog)
                continue;

            // Only track Added, Modified, Deleted states
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            var auditLog = CreateAuditEntry(entry, timestamp, currentUserId, sourceIpAddress);
            if (auditLog != null)
            {
                auditEntries.Add(auditLog);
            }
        }

        return auditEntries;
    }

    private AuditLog? CreateAuditEntry(EntityEntry entry, DateTime timestamp, int userId, string sourceIp)
    {
        var entityType = entry.Entity.GetType().Name;
        var entityId = GetEntityId(entry);

        var actionType = entry.State switch
        {
            EntityState.Added => "Create",
            EntityState.Modified => "Update",
            EntityState.Deleted => "Delete",
            _ => null
        };

        if (actionType == null)
            return null;

        string? previousValue = null;
        string? newValue = null;

        try
        {
            if (entry.State == EntityState.Modified)
            {
                var changes = GetChangedProperties(entry);
                previousValue = JsonSerializer.Serialize(changes.Previous);
                newValue = JsonSerializer.Serialize(changes.Current);
            }
            else if (entry.State == EntityState.Added)
            {
                newValue = JsonSerializer.Serialize(GetCurrentValues(entry));
            }
            else if (entry.State == EntityState.Deleted)
            {
                previousValue = JsonSerializer.Serialize(GetOriginalValues(entry));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to serialize audit values for {EntityType} {EntityId}",
                entityType, entityId);
        }

        return new AuditLog
        {
            UserId = userId,
            Timestamp = timestamp,
            ActionType = actionType,
            EntityType = entityType,
            EntityId = entityId,
            PreviousValue = previousValue,
            NewValue = newValue,
            SourceIpAddress = sourceIp
        };
    }

    /// <summary>
    /// Gets the current authenticated user's ID from the user context.
    /// Returns 0 if no user is authenticated (e.g., system/background processes).
    /// </summary>
    private int GetCurrentUserId()
    {
        try
        {
            return _userContext.IsAuthenticated ? _userContext.UserId : 0;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Unable to resolve current user ID for audit entry");
            return 0;
        }
    }

    /// <summary>
    /// Gets the source IP address from the current HTTP request.
    /// Falls back to "System" for background processes without an HTTP context.
    /// </summary>
    private string GetSourceIpAddress()
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
                return "System";

            // Check X-Forwarded-For header first (for reverse proxy scenarios like IIS)
            var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwardedFor))
            {
                // Take the first IP in the chain (original client IP)
                var clientIp = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .FirstOrDefault()?.Trim();
                if (!string.IsNullOrWhiteSpace(clientIp))
                    return clientIp;
            }

            // Fall back to the remote IP address from the connection
            var remoteIp = httpContext.Connection.RemoteIpAddress;
            if (remoteIp != null)
            {
                // Convert IPv4-mapped IPv6 addresses to IPv4
                if (remoteIp.IsIPv4MappedToIPv6)
                    return remoteIp.MapToIPv4().ToString();
                return remoteIp.ToString();
            }

            return "Unknown";
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Unable to resolve source IP address for audit entry");
            return "Unknown";
        }
    }

    private static int GetEntityId(EntityEntry entry)
    {
        var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
        if (idProperty?.CurrentValue is int intId)
            return intId;
        if (idProperty?.CurrentValue is long longId)
            return (int)longId;
        return 0;
    }

    private static (Dictionary<string, object?> Previous, Dictionary<string, object?> Current) GetChangedProperties(EntityEntry entry)
    {
        var previous = new Dictionary<string, object?>();
        var current = new Dictionary<string, object?>();

        foreach (var property in entry.Properties.Where(p => p.IsModified))
        {
            previous[property.Metadata.Name] = property.OriginalValue;
            current[property.Metadata.Name] = property.CurrentValue;
        }

        return (previous, current);
    }

    private static Dictionary<string, object?> GetCurrentValues(EntityEntry entry)
    {
        var values = new Dictionary<string, object?>();
        foreach (var property in entry.Properties)
        {
            if (!property.Metadata.IsShadowProperty())
                values[property.Metadata.Name] = property.CurrentValue;
        }
        return values;
    }

    private static Dictionary<string, object?> GetOriginalValues(EntityEntry entry)
    {
        var values = new Dictionary<string, object?>();
        foreach (var property in entry.Properties)
        {
            if (!property.Metadata.IsShadowProperty())
                values[property.Metadata.Name] = property.OriginalValue;
        }
        return values;
    }
}
