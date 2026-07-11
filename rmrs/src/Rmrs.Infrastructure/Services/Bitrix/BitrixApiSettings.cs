namespace Rmrs.Infrastructure.Services.Bitrix;

/// <summary>
/// Configuration settings for Bitrix API integration.
/// Bound from appsettings.json section "Bitrix".
/// </summary>
public sealed class BitrixApiSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Bitrix";

    /// <summary>
    /// The base URL of the Bitrix platform instance (e.g., https://jbmarks.sdinmotion.co.za).
    /// Used for REST API calls and OAuth authorization redirect.
    /// </summary>
    public string PlatformBaseUrl { get; set; } = "https://jbmarks.sdinmotion.co.za";

    /// <summary>
    /// The Bitrix OAuth server base URL for token operations.
    /// </summary>
    public string OAuthBaseUrl { get; set; } = "https://oauth.bitrix.info";

    /// <summary>
    /// The OAuth client ID for the RMRS application registered with Bitrix.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// The OAuth client secret for the RMRS application.
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// The OAuth callback URL that Bitrix redirects to after authorization.
    /// </summary>
    public string CallbackUrl { get; set; } = "https://records.sdinmotion.co.za/auth/bitrix/callback";

    /// <summary>
    /// The OAuth authorization endpoint path (relative to PlatformBaseUrl).
    /// </summary>
    public string AuthorizePath { get; set; } = "/oauth/authorize/";

    /// <summary>
    /// The OAuth token endpoint path (relative to OAuthBaseUrl).
    /// </summary>
    public string TokenPath { get; set; } = "/oauth/token/";

    /// <summary>
    /// The REST API base path (relative to PlatformBaseUrl).
    /// </summary>
    public string RestApiPath { get; set; } = "/rest";
}
