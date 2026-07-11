namespace Rmrs.Application.Security;

/// <summary>
/// Marks an action or controller that requires the user to re-authenticate
/// before the sensitive operation can proceed. Used for operations such as:
/// - Disposal approval
/// - Role assignment changes
/// - System configuration modifications
/// 
/// When this attribute is present, the ReAuthenticationMiddleware will challenge
/// the user to provide their credentials again before the request is processed.
/// Implements Requirement 10.5.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public class RequiresReAuthenticationAttribute : Attribute
{
    /// <summary>
    /// Optional description of why re-authentication is required.
    /// </summary>
    public string? Reason { get; set; }

    public RequiresReAuthenticationAttribute()
    {
    }

    public RequiresReAuthenticationAttribute(string reason)
    {
        Reason = reason;
    }
}
