using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Security.Requirements;
using Rmrs.Domain.Enums;

namespace Rmrs.Infrastructure.Security;

/// <summary>
/// Authorization handler that checks whether the current user has at least one of the required roles.
/// Reads roles from the ClaimsPrincipal role claims.
/// </summary>
public class RoleRequirementHandler : AuthorizationHandler<RoleRequirement>
{
    private readonly ILogger<RoleRequirementHandler> _logger;

    public RoleRequirementHandler(ILogger<RoleRequirementHandler> logger)
    {
        _logger = logger;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var userRoleClaims = context.User.FindAll(ClaimTypes.Role);
        var userRoles = new List<UserRole>();

        foreach (var claim in userRoleClaims)
        {
            if (Enum.TryParse<UserRole>(claim.Value, ignoreCase: true, out var role))
            {
                userRoles.Add(role);
            }
        }

        // Check if the user has at least one of the allowed roles
        var hasRequiredRole = requirement.AllowedRoles.Any(required => userRoles.Contains(required));

        if (hasRequiredRole)
        {
            context.Succeed(requirement);
        }
        else
        {
            _logger.LogWarning(
                "Role authorization failed. User has roles [{UserRoles}], but requires one of [{RequiredRoles}].",
                string.Join(", ", userRoles),
                string.Join(", ", requirement.AllowedRoles));
        }

        return Task.CompletedTask;
    }
}
