namespace Rmrs.Application.Security.Requirements;

/// <summary>
/// Authorization requirement that checks whether the user can access
/// a resource at a given classification level.
/// The resource's classification level is resolved at runtime via the handler.
/// </summary>
public class ClassificationLevelRequirement : Microsoft.AspNetCore.Authorization.IAuthorizationRequirement
{
    /// <summary>
    /// If set, this is the minimum classification level the user must be authorized for.
    /// When null, the handler determines the required level from the resource context.
    /// </summary>
    public int? RequiredLevel { get; }

    public ClassificationLevelRequirement(int? requiredLevel = null)
    {
        RequiredLevel = requiredLevel;
    }
}
