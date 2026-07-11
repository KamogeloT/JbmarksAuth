namespace Rmrs.Application.Security;

/// <summary>
/// Authorization policy names used for attribute-based access control on controllers/actions.
/// Includes both single-role policies and combined (multi-role) policies.
/// </summary>
public static class PolicyNames
{
    // ─── Single-Role Policies ───────────────────────────────────────
    public const string RequireSystemAdmin = "RequireSystemAdmin";
    public const string RequireRecordsManager = "RequireRecordsManager";
    public const string RequireRegistryClerk = "RequireRegistryClerk";
    public const string RequireDepartmentUser = "RequireDepartmentUser";
    public const string RequireDepartmentSupervisor = "RequireDepartmentSupervisor";
    public const string RequireComplianceOfficer = "RequireComplianceOfficer";
    public const string RequireAuditor = "RequireAuditor";
    public const string RequireArchivist = "RequireArchivist";
    public const string RequireExecutiveViewer = "RequireExecutiveViewer";

    // ─── Combined / Functional Policies ─────────────────────────────
    /// <summary>
    /// SystemAdministrator or RecordsManager can manage file plans.
    /// </summary>
    public const string CanManageFilePlan = "CanManageFilePlan";

    /// <summary>
    /// RegistryClerk, RecordsManager, or DepartmentSupervisor can register records.
    /// </summary>
    public const string CanRegisterRecords = "CanRegisterRecords";

    /// <summary>
    /// RecordsManager can initiate disposal.
    /// </summary>
    public const string CanDispose = "CanDispose";

    /// <summary>
    /// ComplianceOfficer can approve disposal batches.
    /// </summary>
    public const string CanApproveDisposal = "CanApproveDisposal";

    /// <summary>
    /// Archivist can manage archive transfers.
    /// </summary>
    public const string CanManageArchiveTransfer = "CanManageArchiveTransfer";

    /// <summary>
    /// SystemAdministrator, RecordsManager, ComplianceOfficer, Auditor have cross-department access.
    /// </summary>
    public const string CanAccessAllDepartments = "CanAccessAllDepartments";

    /// <summary>
    /// SystemAdministrator, ComplianceOfficer, Auditor can view audit logs.
    /// </summary>
    public const string CanViewAuditLogs = "CanViewAuditLogs";

    /// <summary>
    /// SystemAdministrator, RecordsManager, ComplianceOfficer, ExecutiveViewer can view dashboards.
    /// </summary>
    public const string CanViewDashboards = "CanViewDashboards";

    /// <summary>
    /// RegistryClerk, DepartmentUser, DepartmentSupervisor can upload documents.
    /// </summary>
    public const string CanUploadDocuments = "CanUploadDocuments";

    /// <summary>
    /// SystemAdministrator can assign roles.
    /// </summary>
    public const string CanAssignRoles = "CanAssignRoles";
}
