namespace Rmrs.Application.Models.Bitrix;

/// <summary>
/// Represents an OAuth token pair received from the Bitrix platform.
/// </summary>
public sealed record TokenPair
{
    /// <summary>
    /// The OAuth access token used for API calls.
    /// </summary>
    public required string AccessToken { get; init; }

    /// <summary>
    /// The OAuth refresh token used to obtain new access tokens.
    /// </summary>
    public required string RefreshToken { get; init; }

    /// <summary>
    /// The number of seconds until the access token expires.
    /// </summary>
    public int ExpiresIn { get; init; }
}
