namespace Rmrs.Application.Security;

/// <summary>
/// Defines all system role name constants matching UserRole enum values.
/// Used as policy names and role references throughout the authorization system.
/// </summary>
public static class RoleConstants
{
    public const string SystemAdministrator = "SystemAdministrator";
    public const string RecordsManager = "RecordsManager";
    public const string RegistryClerk = "RegistryClerk";
    public const string DepartmentUser = "DepartmentUser";
    public const string DepartmentSupervisor = "DepartmentSupervisor";
    public const string ComplianceOfficer = "ComplianceOfficer";
    public const string Auditor = "Auditor";
    public const string Archivist = "Archivist";
    public const string ExecutiveViewer = "ExecutiveViewer";
}
