using Rmrs.Application.Interfaces;
using Rmrs.Domain.Enums;

namespace Rmrs.Application.Security;

/// <summary>
/// Restricts Department_User and Department_Supervisor to records matching their DepartmentCode.
/// Records_Manager, System_Administrator, and Compliance_Officer have cross-department access.
/// Implements Requirement 10.2.
/// </summary>
public interface IDepartmentIsolationFilter
{
    /// <summary>
    /// Determines if the current user has access to a resource in the given department.
    /// </summary>
    /// <param name="resourceDepartmentCode">The department code of the resource being accessed.</param>
    /// <returns>True if the user can access resources in that department; false otherwise.</returns>
    bool CanAccessDepartment(string resourceDepartmentCode);

    /// <summary>
    /// Determines if the current user has cross-department access (unrestricted).
    /// </summary>
    bool HasCrossDepartmentAccess { get; }

    /// <summary>
    /// Returns the user's department code (for query filtering).
    /// Returns null if the user has cross-department access.
    /// </summary>
    string? GetFilterDepartmentCode();
}

/// <summary>
/// Default implementation of <see cref="IDepartmentIsolationFilter"/>.
/// </summary>
public class DepartmentIsolationFilter : IDepartmentIsolationFilter
{
    private readonly IUserContext _userContext;

    /// <summary>
    /// Roles that have cross-department access and are not subject to department isolation.
    /// </summary>
    private static readonly HashSet<UserRole> CrossDepartmentRoles = new()
    {
        UserRole.SystemAdministrator,
        UserRole.RecordsManager,
        UserRole.ComplianceOfficer,
        UserRole.Auditor
    };

    public DepartmentIsolationFilter(IUserContext userContext)
    {
        _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
    }

    /// <inheritdoc />
    public bool HasCrossDepartmentAccess
    {
        get
        {
            return _userContext.Roles.Any(r => CrossDepartmentRoles.Contains(r));
        }
    }

    /// <inheritdoc />
    public bool CanAccessDepartment(string resourceDepartmentCode)
    {
        if (string.IsNullOrWhiteSpace(resourceDepartmentCode))
            return false;

        // Users with cross-department roles can access any department
        if (HasCrossDepartmentAccess)
            return true;

        // Department_User and Department_Supervisor are restricted to their own department
        return string.Equals(
            _userContext.DepartmentCode,
            resourceDepartmentCode,
            StringComparison.OrdinalIgnoreCase);
    }

    /// <inheritdoc />
    public string? GetFilterDepartmentCode()
    {
        if (HasCrossDepartmentAccess)
            return null; // No filter needed — can access all departments

        return _userContext.DepartmentCode;
    }
}
