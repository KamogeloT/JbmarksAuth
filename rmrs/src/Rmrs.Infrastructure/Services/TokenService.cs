using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Models.Bitrix;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages OAuth token exchange, encryption via .NET Data Protection API, and storage.
/// Tokens are encrypted at rest using AES-256 via IDataProtector before being stored
/// in the UserTokens table as VARBINARY(MAX).
/// </summary>
public sealed class TokenService : ITokenService
{
    /// <summary>
    /// The Data Protection purpose string used to scope the encryption keys.
    /// </summary>
    private const string DataProtectionPurpose = "Rmrs.OAuth.Tokens.v1";

    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly RmrsDbContext _dbContext;
    private readonly IDataProtector _protector;
    private readonly ILogger<TokenService> _logger;

    public TokenService(
        IBitrixApiClient bitrixApiClient,
        RmrsDbContext dbContext,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<TokenService> logger)
    {
        _bitrixApiClient = bitrixApiClient;
        _dbContext = dbContext;
        _protector = dataProtectionProvider.CreateProtector(DataProtectionPurpose);
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TokenPair> ExchangeCodeAsync(string authorizationCode, int userId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authorizationCode);

        _logger.LogInformation("Exchanging authorization code for tokens for user {UserId}", userId);

        // Exchange the authorization code via the Bitrix API client
        var tokenPair = await _bitrixApiClient.ExchangeAuthCodeAsync(authorizationCode);

        // Store the tokens encrypted
        await StoreTokensAsync(tokenPair, userId);

        return tokenPair;
    }

    /// <inheritdoc />
    public async Task StoreTokensAsync(TokenPair tokenPair, int userId)
    {
        // Encrypt tokens using .NET Data Protection API (AES-256-GCM under the hood)
        var encryptedAccessToken = EncryptToken(tokenPair.AccessToken);
        var encryptedRefreshToken = EncryptToken(tokenPair.RefreshToken);

        // Calculate token expiry
        var accessTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenPair.ExpiresIn);

        // Check if user already has tokens stored — update or insert
        var existingToken = await _dbContext.UserTokens
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (existingToken != null)
        {
            existingToken.AccessTokenEncrypted = encryptedAccessToken;
            existingToken.RefreshTokenEncrypted = encryptedRefreshToken;
            existingToken.AccessTokenExpiresAt = accessTokenExpiresAt;
            existingToken.UpdatedAt = DateTime.UtcNow;

            _dbContext.UserTokens.Update(existingToken);
        }
        else
        {
            var userToken = new UserToken
            {
                UserId = userId,
                AccessTokenEncrypted = encryptedAccessToken,
                RefreshTokenEncrypted = encryptedRefreshToken,
                AccessTokenExpiresAt = accessTokenExpiresAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.UserTokens.Add(userToken);
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Successfully stored encrypted tokens for user {UserId}, expires at {ExpiresAt}",
            userId, accessTokenExpiresAt);
    }

    /// <inheritdoc />
    public async Task<string> GetValidAccessTokenAsync(int userId)
    {
        var userToken = await _dbContext.UserTokens
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (userToken == null)
        {
            throw new InvalidOperationException($"No tokens found for user {userId}");
        }

        // If the access token is still valid (with 1 minute buffer), decrypt and return
        if (userToken.AccessTokenExpiresAt > DateTime.UtcNow.AddMinutes(1))
        {
            return DecryptToken(userToken.AccessTokenEncrypted);
        }

        // Token is expired or about to expire — attempt refresh
        _logger.LogInformation("Access token expired for user {UserId}, attempting refresh", userId);

        var refreshSucceeded = await RefreshTokenAsync(userId);
        if (!refreshSucceeded)
        {
            throw new InvalidOperationException(
                $"Failed to refresh token for user {userId}. Session should be invalidated.");
        }

        // Re-fetch the updated token after successful refresh
        var refreshedToken = await _dbContext.UserTokens
            .FirstOrDefaultAsync(t => t.UserId == userId);

        return DecryptToken(refreshedToken!.AccessTokenEncrypted);
    }

    /// <inheritdoc />
    public async Task<bool> RefreshTokenAsync(int userId)
    {
        var userToken = await _dbContext.UserTokens
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (userToken == null)
        {
            _logger.LogWarning("No tokens found for user {UserId} during refresh attempt", userId);
            return false;
        }

        try
        {
            // Decrypt the current refresh token
            var currentRefreshToken = DecryptToken(userToken.RefreshTokenEncrypted);

            // Call Bitrix OAuth to get new tokens
            var newTokenPair = await _bitrixApiClient.RefreshTokenAsync(currentRefreshToken);

            // Encrypt and store the new tokens
            userToken.AccessTokenEncrypted = EncryptToken(newTokenPair.AccessToken);
            userToken.RefreshTokenEncrypted = EncryptToken(newTokenPair.RefreshToken);
            userToken.AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(newTokenPair.ExpiresIn);
            userToken.UpdatedAt = DateTime.UtcNow;

            _dbContext.UserTokens.Update(userToken);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Successfully refreshed tokens for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh token for user {UserId}", userId);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task RevokeTokensAsync(int userId)
    {
        var userToken = await _dbContext.UserTokens
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (userToken != null)
        {
            _dbContext.UserTokens.Remove(userToken);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("Revoked and removed tokens for user {UserId}", userId);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Encryption Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Encrypts a plaintext token string to a byte array using the .NET Data Protection API.
    /// The underlying algorithm is AES-256-CBC-HMACSHA256 (or AES-256-GCM depending on platform).
    /// </summary>
    private byte[] EncryptToken(string token)
    {
        var plainBytes = System.Text.Encoding.UTF8.GetBytes(token);
        return _protector.Protect(plainBytes);
    }

    /// <summary>
    /// Decrypts an encrypted byte array back to the original plaintext token string.
    /// </summary>
    private string DecryptToken(byte[] encryptedToken)
    {
        var plainBytes = _protector.Unprotect(encryptedToken);
        return System.Text.Encoding.UTF8.GetString(plainBytes);
    }
}
