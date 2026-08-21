using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Rmrs.Domain.Enums;

namespace Rmrs.Api.Authentication;

/// <summary>
/// DEV BYPASS: Authentication handler that auto-authenticates all requests as admin (user ID 1).
/// Remove before production deployment.
/// </summary>
public class DevBypassAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "DevBypass";

    public DevBypassAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new("BitrixUserId", "1"),
            new(ClaimTypes.Name, "System Administrator"),
            new(ClaimTypes.Email, "admin@t3ssystems.co.za"),
            new("DepartmentCode", "ADMIN"),
            new("MaxClassificationLevel", "4"),
            // All roles for testing
            new(ClaimTypes.Role, nameof(UserRole.SystemAdministrator)),
            new(ClaimTypes.Role, nameof(UserRole.RecordsManager)),
            new(ClaimTypes.Role, nameof(UserRole.RegistryClerk)),
            new(ClaimTypes.Role, nameof(UserRole.DepartmentUser)),
            new(ClaimTypes.Role, nameof(UserRole.DepartmentSupervisor)),
            new(ClaimTypes.Role, nameof(UserRole.ComplianceOfficer)),
            new(ClaimTypes.Role, nameof(UserRole.Auditor)),
            new(ClaimTypes.Role, nameof(UserRole.Archivist)),
            new(ClaimTypes.Role, nameof(UserRole.ExecutiveViewer)),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
