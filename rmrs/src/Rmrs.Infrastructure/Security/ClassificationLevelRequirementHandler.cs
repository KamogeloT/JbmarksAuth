using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Security.Requirements;

namespace Rmrs.Infrastructure.Security;

/// <summary>
/// Authorization handler that checks whether the current user's MaxClassificationLevel
/// is sufficient to access the required classification level.
/// </summary>
public class ClassificationLevelRequirementHandler : AuthorizationHandler<ClassificationLevelRequirement>
{
    private readonly ILogger<ClassificationLevelRequirementHandler> _logger;

    public ClassificationLevelRequirementHandler(ILogger<ClassificationLevelRequirementHandler> logger)
    {
        _logger = logger;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ClassificationLevelRequirement requirement)
    {
        var maxLevelClaim = context.User.FindFirst("MaxClassificationLevel");

        if (maxLevelClaim == null || !int.TryParse(maxLevelClaim.Value, out var userMaxLevel))
        {
            _logger.LogWarning(
                "Classification level authorization failed. " +
                "User does not have MaxClassificationLevel claim.");
            return Task.CompletedTask; // Fail (don't succeed)
        }

        // If the requirement specifies a fixed level, check directly
        if (requirement.RequiredLevel.HasValue)
        {
            if (userMaxLevel >= requirement.RequiredLevel.Value)
            {
                context.Succeed(requirement);
            }
            else
            {
                var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
                _logger.LogWarning(
                    "Classification access denied. UserId={UserId}, UserMaxLevel={UserMaxLevel}, RequiredLevel={RequiredLevel}, Timestamp={Timestamp}",
                    userIdClaim,
                    userMaxLevel,
                    requirement.RequiredLevel.Value,
                    DateTime.UtcNow);
            }
        }
        else
        {
            // When no specific level is set, the requirement acts as a marker.
            // The resource-level check is handled by ClassificationGuard at the service layer.
            // For policy-based checks without a resource context, succeed if user has any level.
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
