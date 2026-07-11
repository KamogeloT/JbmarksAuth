using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Enums;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Implementation of IUserContext that extracts the current user's information
/// from the HTTP context session/claims.
/// </summary>
public class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private HttpContext? HttpContext => _httpContextAccessor.HttpContext;

    public int UserId =>
        GetClaimValueAsInt(ClaimTypes.NameIdentifier);

    public int BitrixUserId =>
        GetClaimValueAsInt("BitrixUserId");

    public string FullName =>
        GetClaimValue(ClaimTypes.Name) ?? string.Empty;

    public string Email =>
        GetClaimValue(ClaimTypes.Email) ?? string.Empty;

    public string? DepartmentCode =>
        GetClaimValue("DepartmentCode");

    public IReadOnlyList<UserRole> Roles
    {
        get
        {
            var roleClaims = HttpContext?.User?.FindAll(ClaimTypes.Role) ?? Enumerable.Empty<Claim>();
            var roles = new List<UserRole>();

            foreach (var claim in roleClaims)
            {
                if (Enum.TryParse<UserRole>(claim.Value, ignoreCase: true, out var role))
                {
                    roles.Add(role);
                }
            }

            return roles.AsReadOnly();
        }
    }

    public int MaxClassificationLevel =>
        GetClaimValueAsInt("MaxClassificationLevel");

    public bool IsAuthenticated =>
        HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public bool HasRole(UserRole role)
    {
        return Roles.Contains(role);
    }

    public bool CanAccessClassificationLevel(int classificationLevel)
    {
        return classificationLevel <= MaxClassificationLevel;
    }

    private string? GetClaimValue(string claimType)
    {
        return HttpContext?.User?.FindFirst(claimType)?.Value;
    }

    private int GetClaimValueAsInt(string claimType)
    {
        var value = GetClaimValue(claimType);
        return int.TryParse(value, out var result) ? result : 0;
    }
}
