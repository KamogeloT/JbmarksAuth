using Rmrs.Domain.Enums;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Provides access to the current authenticated user's information.
/// Extracted from the session/claims for use in controllers and services.
/// </summary>
public interface IUserContext
{
    /// <summary>
    /// The current user's internal database ID.
    /// </summary>
    int UserId { get; }

    /// <summary>
    /// The current user's Bitrix user ID.
    /// </summary>
    int BitrixUserId { get; }

    /// <summary>
    /// The current user's full name.
    /// </summary>
    string FullName { get; }

    /// <summary>
    /// The current user's email address.
    /// </summary>
    string Email { get; }

    /// <summary>
    /// The current user's department code (may be null if not assigned).
    /// </summary>
    string? DepartmentCode { get; }

    /// <summary>
    /// The current user's assigned roles.
    /// </summary>
    IReadOnlyList<UserRole> Roles { get; }

    /// <summary>
    /// The current user's maximum authorized classification level.
    /// </summary>
    int MaxClassificationLevel { get; }

    /// <summary>
    /// Whether the current request has an authenticated user.
    /// </summary>
    bool IsAuthenticated { get; }

    /// <summary>
    /// Checks whether the current user has the specified role.
    /// </summary>
    bool HasRole(UserRole role);

    /// <summary>
    /// Checks whether the current user can access a given classification level.
    /// </summary>
    bool CanAccessClassificationLevel(int classificationLevel);
}
