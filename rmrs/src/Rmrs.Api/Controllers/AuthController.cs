using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.Persistence;
using Rmrs.Infrastructure.Services.Bitrix;
using Rmrs.Domain.Entities;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Handles Bitrix OAuth 2.0 authentication flow: login redirect, callback processing,
/// user profile retrieval, and session management.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly ITokenService _tokenService;
    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly RmrsDbContext _dbContext;
    private readonly BitrixApiSettings _bitrixSettings;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ITokenService tokenService,
        IBitrixApiClient bitrixApiClient,
        RmrsDbContext dbContext,
        IOptions<BitrixApiSettings> bitrixSettings,
        ILogger<AuthController> logger)
    {
        _tokenService = tokenService;
        _bitrixApiClient = bitrixApiClient;
        _dbContext = dbContext;
        _bitrixSettings = bitrixSettings.Value;
        _logger = logger;
    }

    /// <summary>
    /// Initiates the Bitrix OAuth 2.0 flow by redirecting the user to the Bitrix authorization endpoint.
    /// Generates a random state parameter to prevent CSRF attacks.
    /// </summary>
    /// <returns>Redirect to Bitrix OAuth authorize URL.</returns>
    [HttpGet("login")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult Login()
    {
        // Generate a random state parameter for CSRF protection
        var state = GenerateRandomState();

        // Store the state in the session for validation in the callback
        HttpContext.Session.SetString("OAuthState", state);

        // Construct the Bitrix OAuth authorization URL
        var authorizeUrl = $"{_bitrixSettings.PlatformBaseUrl}{_bitrixSettings.AuthorizePath}" +
            $"?client_id={Uri.EscapeDataString(_bitrixSettings.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(_bitrixSettings.CallbackUrl)}" +
            $"&response_type=code" +
            $"&state={Uri.EscapeDataString(state)}";

        _logger.LogInformation("Redirecting user to Bitrix OAuth authorization endpoint");

        return Redirect(authorizeUrl);
    }

    /// <summary>
    /// OAuth 2.0 callback endpoint. Receives the authorization code from Bitrix,
    /// validates the state parameter, exchanges the code for tokens, fetches/syncs
    /// the user profile, creates a session, and redirects to the SPA.
    /// </summary>
    /// <param name="code">The authorization code from Bitrix.</param>
    /// <param name="state">The state parameter for CSRF validation.</param>
    /// <returns>Redirect to the SPA on success, or an error response.</returns>
    [HttpGet("bitrix/callback")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state)
    {
        // Validate required parameters
        if (string.IsNullOrWhiteSpace(code))
        {
            _logger.LogWarning("OAuth callback received without authorization code");
            return BadRequest(new { Error = "Authorization code is required" });
        }

        // Validate state parameter to prevent CSRF
        var storedState = HttpContext.Session.GetString("OAuthState");
        if (string.IsNullOrWhiteSpace(state) || state != storedState)
        {
            _logger.LogWarning("OAuth callback state mismatch. Expected: {Expected}, Received: {Received}",
                storedState, state);
            return BadRequest(new { Error = "Invalid state parameter. Possible CSRF attack." });
        }

        // Clear the stored state
        HttpContext.Session.Remove("OAuthState");

        try
        {
            // Exchange authorization code for tokens (via BitrixApiClient directly first
            // to get a temporary token for user profile fetch)
            var tokenPair = await _bitrixApiClient.ExchangeAuthCodeAsync(code);

            // Fetch user profile from Bitrix using the access token
            var bitrixProfile = await _bitrixApiClient.GetUserProfileAsync(tokenPair.AccessToken);

            // Create or update local user
            var user = await SyncUserFromBitrixProfileAsync(bitrixProfile);

            // Store the encrypted tokens associated with the user
            await _tokenService.StoreTokensAsync(tokenPair, user.Id);

            // Create a session for the user
            var session = await CreateUserSessionAsync(user);

            // Set the session cookie
            HttpContext.Session.SetString("SessionId", session.Id.ToString());
            HttpContext.Session.SetInt32("UserId", user.Id);

            _logger.LogInformation("User {UserId} ({FullName}) authenticated successfully via Bitrix OAuth",
                user.Id, user.FullName);

            // Redirect to the Angular SPA
            return Redirect("/");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OAuth callback processing failed");
            return Redirect("/auth/error?message=Authentication+failed");
        }
    }

    /// <summary>
    /// Returns the current authenticated user's profile information.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null || userId == 0)
        {
            return Unauthorized(new { Error = "Not authenticated" });
        }

        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null)
        {
            return Unauthorized(new { Error = "User not found" });
        }

        return Ok(new
        {
            user.Id,
            user.BitrixUserId,
            user.Email,
            user.FullName,
            user.DepartmentCode,
            user.MaxClassificationLevel,
            user.IsActive
        });
    }

    /// <summary>
    /// Logs out the current user by invalidating their session.
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        var sessionIdStr = HttpContext.Session.GetString("SessionId");
        if (!string.IsNullOrEmpty(sessionIdStr) && Guid.TryParse(sessionIdStr, out var sessionId))
        {
            var session = await _dbContext.UserSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session != null)
            {
                session.IsActive = false;
                _dbContext.UserSessions.Update(session);
                await _dbContext.SaveChangesAsync();
            }
        }

        HttpContext.Session.Clear();

        _logger.LogInformation("User session invalidated");

        return NoContent();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates or updates a local User record from the Bitrix user profile.
    /// </summary>
    private async Task<User> SyncUserFromBitrixProfileAsync(
        Application.Models.Bitrix.BitrixUserProfile profile)
    {
        var existingUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.BitrixUserId == profile.Id);

        if (existingUser != null)
        {
            // Update existing user
            existingUser.Email = profile.Email;
            existingUser.FullName = profile.FullName;
            existingUser.DepartmentCode = profile.Department;
            existingUser.UpdatedAt = DateTime.UtcNow;

            _dbContext.Users.Update(existingUser);
            await _dbContext.SaveChangesAsync();

            return existingUser;
        }

        // Create new user
        var newUser = new User
        {
            BitrixUserId = profile.Id,
            Email = profile.Email,
            FullName = profile.FullName,
            DepartmentCode = profile.Department,
            MaxClassificationLevel = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(newUser);
        await _dbContext.SaveChangesAsync();

        return newUser;
    }

    /// <summary>
    /// Creates a new user session with 30-minute expiry.
    /// </summary>
    private async Task<UserSession> CreateUserSessionAsync(User user)
    {
        // Deactivate any existing active sessions for this user
        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == user.Id && s.IsActive)
            .ToListAsync();

        foreach (var activeSession in activeSessions)
        {
            activeSession.IsActive = false;
        }

        // Create a new session
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            SessionToken = GenerateRandomState(), // Use as unique session token
            LastActivityAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            IsActive = true
        };

        _dbContext.UserSessions.Add(session);
        await _dbContext.SaveChangesAsync();

        return session;
    }

    /// <summary>
    /// Generates a cryptographically random state string for OAuth CSRF protection.
    /// </summary>
    private static string GenerateRandomState()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }
}
