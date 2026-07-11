using Microsoft.AspNetCore.Authorization;
using Rmrs.Application.Security;
using Rmrs.Application.Security.Requirements;
using Rmrs.Domain.Enums;
using Rmrs.Infrastructure.Security;

namespace Rmrs.Api.Extensions;

/// <summary>
/// Extension method to register all RMRS authorization policies and handlers.
/// Implements Requirement 10.1 (RBAC), 10.2 (department isolation), 10.3 (classification access).
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// Adds RMRS authorization policies, handlers, and security services to the service collection.
    /// </summary>
    public static IServiceCollection AddRmrsAuthorization(this IServiceCollection services)
    {
        // Register authorization handlers
        services.AddScoped<IAuthorizationHandler, RoleRequirementHandler>();
        services.AddScoped<IAuthorizationHandler, ClassificationLevelRequirementHandler>();
        services.AddScoped<IAuthorizationHandler, DepartmentAccessRequirementHandler>();

        // Register application security services
        services.AddScoped<Rmrs.Application.Security.IClassificationGuard, Rmrs.Application.Security.ClassificationGuard>();
        services.AddScoped<Rmrs.Application.Security.IDepartmentIsolationFilter, Rmrs.Application.Security.DepartmentIsolationFilter>();

        // Configure authorization policies
        services.AddAuthorizationBuilder()
            // ─── Single-Role Policies ───────────────────────────────────────
            .AddPolicy(PolicyNames.RequireSystemAdmin, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.SystemAdministrator)))

            .AddPolicy(PolicyNames.RequireRecordsManager, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.RecordsManager)))

            .AddPolicy(PolicyNames.RequireRegistryClerk, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.RegistryClerk)))

            .AddPolicy(PolicyNames.RequireDepartmentUser, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.DepartmentUser)))

            .AddPolicy(PolicyNames.RequireDepartmentSupervisor, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.DepartmentSupervisor)))

            .AddPolicy(PolicyNames.RequireComplianceOfficer, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.ComplianceOfficer)))

            .AddPolicy(PolicyNames.RequireAuditor, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.Auditor)))

            .AddPolicy(PolicyNames.RequireArchivist, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.Archivist)))

            .AddPolicy(PolicyNames.RequireExecutiveViewer, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.ExecutiveViewer)))

            // ─── Combined / Functional Policies ─────────────────────────────
            .AddPolicy(PolicyNames.CanManageFilePlan, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.SystemAdministrator,
                    UserRole.RecordsManager)))

            .AddPolicy(PolicyNames.CanRegisterRecords, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.RegistryClerk,
                    UserRole.RecordsManager,
                    UserRole.DepartmentSupervisor)))

            .AddPolicy(PolicyNames.CanDispose, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.RecordsManager)))

            .AddPolicy(PolicyNames.CanApproveDisposal, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.ComplianceOfficer)))

            .AddPolicy(PolicyNames.CanManageArchiveTransfer, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.Archivist)))

            .AddPolicy(PolicyNames.CanAccessAllDepartments, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.SystemAdministrator,
                    UserRole.RecordsManager,
                    UserRole.ComplianceOfficer,
                    UserRole.Auditor)))

            .AddPolicy(PolicyNames.CanViewAuditLogs, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.SystemAdministrator,
                    UserRole.ComplianceOfficer,
                    UserRole.Auditor)))

            .AddPolicy(PolicyNames.CanViewDashboards, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.SystemAdministrator,
                    UserRole.RecordsManager,
                    UserRole.ComplianceOfficer,
                    UserRole.ExecutiveViewer)))

            .AddPolicy(PolicyNames.CanUploadDocuments, policy =>
                policy.AddRequirements(new RoleRequirement(
                    UserRole.RegistryClerk,
                    UserRole.DepartmentUser,
                    UserRole.DepartmentSupervisor)))

            .AddPolicy(PolicyNames.CanAssignRoles, policy =>
                policy.AddRequirements(new RoleRequirement(UserRole.SystemAdministrator)));

        return services;
    }
}
