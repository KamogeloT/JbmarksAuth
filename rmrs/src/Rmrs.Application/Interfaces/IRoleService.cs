using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing user role assignments with full audit trail.
/// Implements Requirements 10.4, 10.5.
/// </summary>
public interface IRoleService
{
    /// <summary>
    /// Assigns a role to a user, recording effective date, assigning admin, and justification.
    /// </summary>
    /// <param name="request">The role assignment request details.</param>
    /// <param name="adminUserId">The ID of the admin performing the assignment.</param>
    /// <returns>The created UserRole entity.</returns>
    Task<UserRole> AssignRoleAsync(AssignRoleRequest request, int adminUserId);

    /// <summary>
    /// Revokes (deactivates) a role assignment for a user.
    /// </summary>
    /// <param name="userId">The user whose role is being revoked.</param>
    /// <param name="roleName">The role name to revoke.</param>
    /// <param name="adminUserId">The ID of the admin performing the revocation.</param>
    Task RevokeRoleAsync(int userId, string roleName, int adminUserId);

    /// <summary>
    /// Returns all active role assignments for a user.
    /// </summary>
    /// <param name="userId">The user ID to query.</param>
    /// <returns>Collection of active UserRole entities.</returns>
    Task<IEnumerable<UserRole>> GetUserRolesAsync(int userId);
}

/// <summary>
/// Request model for assigning a role to a user.
/// </summary>
public class AssignRoleRequest
{
    /// <summary>
    /// The user to assign the role to.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// The role name to assign. Must be one of the 9 defined system roles.
    /// </summary>
    public string RoleName { get; set; } = string.Empty;

    /// <summary>
    /// The date from which the role becomes effective.
    /// </summary>
    public DateTime EffectiveDate { get; set; }

    /// <summary>
    /// Justification for the role assignment (required).
    /// </summary>
    public string Justification { get; set; } = string.Empty;
}
