namespace Rmrs.Application.Models;

/// <summary>
/// Standardized API error response model as defined in the design document.
/// Provides a consistent error format across all API endpoints.
/// </summary>
public class ApiError
{
    /// <summary>
    /// Machine-readable error code (e.g., "VALIDATION_ERROR", "NOT_FOUND").
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Additional context or detail about the error (optional).
    /// </summary>
    public string? Detail { get; set; }

    /// <summary>
    /// Correlation ID for troubleshooting, maps to the HTTP request trace identifier.
    /// </summary>
    public string TraceId { get; set; } = string.Empty;
}

/// <summary>
/// Standard error codes used across the RMRS application.
/// </summary>
public static class ApiErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string AuthenticationError = "AUTHENTICATION_ERROR";
    public const string AuthorizationError = "AUTHORIZATION_ERROR";
    public const string NotFound = "NOT_FOUND";
    public const string Conflict = "CONFLICT";
    public const string BitrixApiError = "BITRIX_API_ERROR";
    public const string RateLimited = "RATE_LIMITED";
    public const string ServerError = "SERVER_ERROR";
}
