using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Security.Requirements;
using Rmrs.Domain.Enums;

namespace Rmrs.Infrastructure.Security;

/// <summary>
/// Authorization handler that enforces department-level isolation.
/// Department_User and Department_Supervisor roles are restricted to their assigned department.
/// System_Administrator, Records_Manager, Compliance_Officer, and Auditor have cross-department access.
/// </summary>
public class DepartmentAccessRequirementHandler : AuthorizationHandler<DepartmentAccessRequirement>
{
    private readonly ILogger<DepartmentAccessRequirementHandler> _logger;

    /// <summary>
    /// Roles that bypass department isolation.
    /// </summary>
    private static readonly HashSet<UserRole> CrossDepartmentRoles = new()
    {
        UserRole.SystemAdministrator,
        UserRole.RecordsManager,
        UserRole.ComplianceOfficer,
        UserRole.Auditor
    };

    public DepartmentAccessRequirementHandler(ILogger<DepartmentAccessRequirementHandler> logger)
    {
        _logger = logger;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DepartmentAccessRequirement requirement)
    {
        // Parse user roles from claims
        var userRoleClaims = context.User.FindAll(ClaimTypes.Role);
        var userRoles = new List<UserRole>();

        foreach (var claim in userRoleClaims)
        {
            if (Enum.TryParse<UserRole>(claim.Value, ignoreCase: true, out var role))
            {
                userRoles.Add(role);
            }
        }

        // If user has any cross-department role, they pass
        if (userRoles.Any(r => CrossDepartmentRoles.Contains(r)))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // If no specific resource department is set, succeed (filter will be applied at query level)
        if (string.IsNullOrWhiteSpace(requirement.ResourceDepartmentCode))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Department-restricted user: check if their department matches the resource
        var userDepartmentClaim = context.User.FindFirst("DepartmentCode")?.Value;

        if (!string.IsNullOrWhiteSpace(userDepartmentClaim) &&
            string.Equals(userDepartmentClaim, requirement.ResourceDepartmentCode, StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
        else
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
            _logger.LogWarning(
                "Department access denied. UserId={UserId}, UserDepartment={UserDepartment}, " +
                "ResourceDepartment={ResourceDepartment}, Timestamp={Timestamp}",
                userId,
                userDepartmentClaim ?? "none",
                requirement.ResourceDepartmentCode,
                DateTime.UtcNow);
        }

        return Task.CompletedTask;
    }
}
