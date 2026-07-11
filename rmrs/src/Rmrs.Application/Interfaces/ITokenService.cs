using Rmrs.Application.Models.Bitrix;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Manages OAuth token exchange, encrypted storage, and retrieval.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Exchanges an authorization code for an OAuth token pair,
    /// encrypts the tokens, and stores them in the UserTokens table.
    /// </summary>
    /// <param name="authorizationCode">The authorization code received from Bitrix OAuth callback.</param>
    /// <param name="userId">The local user ID to associate the tokens with.</param>
    /// <returns>The token pair (unencrypted) for immediate use.</returns>
    Task<TokenPair> ExchangeCodeAsync(string authorizationCode, int userId);

    /// <summary>
    /// Stores an already-exchanged token pair encrypted in the database.
    /// Used when the token exchange was done externally (e.g., in the callback flow).
    /// </summary>
    /// <param name="tokenPair">The token pair to encrypt and store.</param>
    /// <param name="userId">The local user ID to associate the tokens with.</param>
    Task StoreTokensAsync(TokenPair tokenPair, int userId);

    /// <summary>
    /// Retrieves a valid (non-expired) access token for the specified user.
    /// If the token is expired, it will attempt to refresh it automatically.
    /// </summary>
    /// <param name="userId">The user ID to retrieve the token for.</param>
    /// <returns>A valid access token string.</returns>
    Task<string> GetValidAccessTokenAsync(int userId);

    /// <summary>
    /// Refreshes the access token for the specified user using their stored refresh token.
    /// </summary>
    /// <param name="userId">The user ID whose token to refresh.</param>
    /// <returns>True if the refresh was successful, false otherwise.</returns>
    Task<bool> RefreshTokenAsync(int userId);

    /// <summary>
    /// Revokes all tokens for the specified user by removing them from storage.
    /// </summary>
    /// <param name="userId">The user ID whose tokens to revoke.</param>
    Task RevokeTokensAsync(int userId);
}
