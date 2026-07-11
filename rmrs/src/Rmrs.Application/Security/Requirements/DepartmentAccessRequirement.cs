namespace Rmrs.Application.Security.Requirements;

/// <summary>
/// Authorization requirement that enforces department-level isolation.
/// Department_User and Department_Supervisor can only access resources within their department.
/// Records_Manager, System_Administrator, and Compliance_Officer have cross-department access.
/// </summary>
public class DepartmentAccessRequirement : Microsoft.AspNetCore.Authorization.IAuthorizationRequirement
{
    /// <summary>
    /// When set, this is the specific department code the resource belongs to.
    /// When null, the handler determines the department from the resource context.
    /// </summary>
    public string? ResourceDepartmentCode { get; }

    public DepartmentAccessRequirement(string? resourceDepartmentCode = null)
    {
        ResourceDepartmentCode = resourceDepartmentCode;
    }
}
