using Rmrs.Domain.Enums;

namespace Rmrs.Application.Security.Requirements;

/// <summary>
/// Authorization requirement that the user must have at least one of the specified roles.
/// </summary>
public class RoleRequirement : Microsoft.AspNetCore.Authorization.IAuthorizationRequirement
{
    /// <summary>
    /// The roles that satisfy this requirement. User must have at least one.
    /// </summary>
    public IReadOnlyList<UserRole> AllowedRoles { get; }

    public RoleRequirement(params UserRole[] allowedRoles)
    {
        if (allowedRoles == null || allowedRoles.Length == 0)
            throw new ArgumentException("At least one role must be specified.", nameof(allowedRoles));

        AllowedRoles = allowedRoles.ToList().AsReadOnly();
    }
}
