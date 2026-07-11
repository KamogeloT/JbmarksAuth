using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;
using UserRoleEnum = Rmrs.Domain.Enums.UserRole;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Service for managing user role assignments with full audit trail.
/// Records effective date, assigning administrator, and justification for every assignment.
/// Implements Requirements 10.4, 10.5.
/// </summary>
public class RoleService : IRoleService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<RoleService> _logger;

    /// <summary>
    /// Valid role names as defined in the UserRole enum.
    /// </summary>
    private static readonly HashSet<string> ValidRoleNames = new(
        Enum.GetNames<UserRoleEnum>(),
        StringComparer.OrdinalIgnoreCase);

    public RoleService(
        RmrsDbContext dbContext,
        IAuditLogService auditLogService,
        ILogger<RoleService> logger)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<UserRole> AssignRoleAsync(AssignRoleRequest request, int adminUserId)
    {
        // Validate role name
        if (!ValidRoleNames.Contains(request.RoleName))
        {
            throw new ArgumentException($"Invalid role name: {request.RoleName}. Must be one of the 9 system roles.");
        }

        // Validate justification is provided
        if (string.IsNullOrWhiteSpace(request.Justification))
        {
            throw new ArgumentException("Justification is required for role assignment.");
        }

        // Validate user exists
        var userExists = await _dbContext.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
        {
            throw new InvalidOperationException($"User with ID {request.UserId} not found.");
        }

        // Check if user already has this role active
        var existingRole = await _dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId
                && ur.RoleName == request.RoleName
                && ur.IsActive);

        if (existingRole != null)
        {
            throw new InvalidOperationException(
                $"User {request.UserId} already has an active '{request.RoleName}' role assignment.");
        }

        // Create the role assignment
        var userRole = new UserRole
        {
            UserId = request.UserId,
            RoleName = request.RoleName,
            EffectiveDate = request.EffectiveDate,
            AssignedByUserId = adminUserId,
            Justification = request.Justification,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.UserRoles.Add(userRole);
        await _dbContext.SaveChangesAsync();

        // Log the role assignment in the audit trail
        await _auditLogService.LogAsync(new AuditEntry(
            UserId: adminUserId,
            ActionType: "RoleAssigned",
            EntityType: "UserRole",
            EntityId: userRole.Id,
            PreviousValue: null,
            NewValue: $"Role '{request.RoleName}' assigned to user {request.UserId}. Justification: {request.Justification}"
        ));

        _logger.LogInformation(
            "Role '{RoleName}' assigned to user {UserId} by admin {AdminUserId} with justification: {Justification}",
            request.RoleName, request.UserId, adminUserId, request.Justification);

        return userRole;
    }

    /// <inheritdoc />
    public async Task RevokeRoleAsync(int userId, string roleName, int adminUserId)
    {
        var userRole = await _dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == userId
                && ur.RoleName == roleName
                && ur.IsActive);

        if (userRole == null)
        {
            throw new InvalidOperationException(
                $"No active role '{roleName}' found for user {userId}.");
        }

        userRole.IsActive = false;
        _dbContext.UserRoles.Update(userRole);
        await _dbContext.SaveChangesAsync();

        // Log the role revocation in the audit trail
        await _auditLogService.LogAsync(new AuditEntry(
            UserId: adminUserId,
            ActionType: "RoleRevoked",
            EntityType: "UserRole",
            EntityId: userRole.Id,
            PreviousValue: $"Role '{roleName}' active for user {userId}",
            NewValue: $"Role '{roleName}' revoked for user {userId}"
        ));

        _logger.LogInformation(
            "Role '{RoleName}' revoked from user {UserId} by admin {AdminUserId}",
            roleName, userId, adminUserId);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<UserRole>> GetUserRolesAsync(int userId)
    {
        return await _dbContext.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId && ur.IsActive)
            .OrderBy(ur => ur.RoleName)
            .ToListAsync();
    }
}
