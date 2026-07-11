namespace Rmrs.Application.Models.Bitrix;

/// <summary>
/// Represents a user profile retrieved from the Bitrix platform via the user.current API.
/// </summary>
public sealed record BitrixUserProfile
{
    /// <summary>
    /// The unique Bitrix user identifier.
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// The user's first name.
    /// </summary>
    public string FirstName { get; init; } = string.Empty;

    /// <summary>
    /// The user's last name.
    /// </summary>
    public string LastName { get; init; } = string.Empty;

    /// <summary>
    /// The user's full display name.
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// The user's email address.
    /// </summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// The user's department name or code from Bitrix.
    /// </summary>
    public string? Department { get; init; }
}
