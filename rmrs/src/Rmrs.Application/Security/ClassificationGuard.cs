using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Enums;

namespace Rmrs.Application.Security;

/// <summary>
/// Enforces classification level access restrictions.
/// Users can only view records at or below their authorized classification level.
/// If denied, logs the access attempt with user ID, record ID, timestamp, and action.
/// Implements Requirement 10.3 and 10.6.
/// </summary>
public interface IClassificationGuard
{
    /// <summary>
    /// Checks if the current user's MaxClassificationLevel is >= the record's classification level.
    /// </summary>
    /// <param name="recordClassificationLevel">The classification level of the record being accessed.</param>
    /// <returns>True if access is permitted; false otherwise.</returns>
    bool CanAccess(int recordClassificationLevel);

    /// <summary>
    /// Checks access and logs a denial if access is not permitted.
    /// </summary>
    /// <param name="recordId">The ID of the record being accessed.</param>
    /// <param name="recordClassificationLevel">The classification level of the record.</param>
    /// <param name="action">The action the user attempted (e.g., "View", "Download").</param>
    /// <returns>True if access is permitted; false if denied (and the attempt is logged).</returns>
    Task<bool> CheckAccessAsync(int recordId, int recordClassificationLevel, string action);
}

/// <summary>
/// Default implementation of <see cref="IClassificationGuard"/>.
/// </summary>
public class ClassificationGuard : IClassificationGuard
{
    private readonly IUserContext _userContext;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ClassificationGuard> _logger;

    public ClassificationGuard(
        IUserContext userContext,
        IAuditLogService auditLogService,
        ILogger<ClassificationGuard> logger)
    {
        _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        _auditLogService = auditLogService ?? throw new ArgumentNullException(nameof(auditLogService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public bool CanAccess(int recordClassificationLevel)
    {
        return _userContext.CanAccessClassificationLevel(recordClassificationLevel);
    }

    /// <inheritdoc />
    public async Task<bool> CheckAccessAsync(int recordId, int recordClassificationLevel, string action)
    {
        if (_userContext.CanAccessClassificationLevel(recordClassificationLevel))
        {
            return true;
        }

        // Log the unauthorized access attempt (Requirement 10.6)
        _logger.LogWarning(
            "Classification access denied. UserId={UserId}, RecordId={RecordId}, " +
            "RecordLevel={RecordLevel}, UserMaxLevel={UserMaxLevel}, Action={Action}, Timestamp={Timestamp}",
            _userContext.UserId,
            recordId,
            (ClassificationLevel)recordClassificationLevel,
            (ClassificationLevel)_userContext.MaxClassificationLevel,
            action,
            DateTime.UtcNow);

        // Persist the unauthorized access attempt to the audit log
        await _auditLogService.LogAsync(new AuditEntry(
            UserId: _userContext.UserId,
            ActionType: "UnauthorizedClassificationAccess",
            EntityType: "Record",
            EntityId: recordId,
            PreviousValue: null,
            NewValue: $"Attempted action: {action}. User max level: {_userContext.MaxClassificationLevel}, Record level: {recordClassificationLevel}"
        ));

        return false;
    }
}
