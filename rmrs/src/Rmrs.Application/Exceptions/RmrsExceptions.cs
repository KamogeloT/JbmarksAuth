namespace Rmrs.Application.Exceptions;

/// <summary>
/// Base exception for RMRS domain/application errors.
/// </summary>
public abstract class RmrsException : Exception
{
    public string ErrorCode { get; }
    public string? Detail { get; }

    protected RmrsException(string errorCode, string message, string? detail = null, Exception? innerException = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        Detail = detail;
    }
}

/// <summary>
/// Thrown when request validation fails (HTTP 400).
/// </summary>
public class ValidationException : RmrsException
{
    public ValidationException(string message, string? detail = null)
        : base("VALIDATION_ERROR", message, detail) { }
}

/// <summary>
/// Thrown when a user is not authenticated (HTTP 401).
/// </summary>
public class AuthenticationException : RmrsException
{
    public AuthenticationException(string message = "Authentication required.", string? detail = null)
        : base("AUTHENTICATION_ERROR", message, detail) { }
}

/// <summary>
/// Thrown when a user lacks required permissions (HTTP 403).
/// </summary>
public class AuthorizationException : RmrsException
{
    public AuthorizationException(string message = "You do not have permission to perform this action.", string? detail = null)
        : base("AUTHORIZATION_ERROR", message, detail) { }
}

/// <summary>
/// Thrown when a requested resource is not found (HTTP 404).
/// </summary>
public class NotFoundException : RmrsException
{
    public NotFoundException(string message = "The requested resource was not found.", string? detail = null)
        : base("NOT_FOUND", message, detail) { }

    public NotFoundException(string entityName, object id)
        : base("NOT_FOUND", $"{entityName} with ID '{id}' was not found.") { }
}

/// <summary>
/// Thrown when a conflict occurs (HTTP 409), e.g., duplicate registry number.
/// </summary>
public class ConflictException : RmrsException
{
    public ConflictException(string message, string? detail = null)
        : base("CONFLICT", message, detail) { }
}

/// <summary>
/// Thrown when a Bitrix API call fails (HTTP 502).
/// </summary>
public class BitrixApiException : RmrsException
{
    public BitrixApiException(string message, string? detail = null, Exception? innerException = null)
        : base("BITRIX_API_ERROR", message, detail, innerException) { }
}

/// <summary>
/// Thrown when rate limiting is triggered (HTTP 429).
/// </summary>
public class RateLimitedException : RmrsException
{
    public RateLimitedException(string message = "Too many requests. Please try again later.", string? detail = null)
        : base("RATE_LIMITED", message, detail) { }
}
