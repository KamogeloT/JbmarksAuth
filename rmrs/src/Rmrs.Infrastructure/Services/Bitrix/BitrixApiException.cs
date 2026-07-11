using System.Net;

namespace Rmrs.Infrastructure.Services.Bitrix;

/// <summary>
/// Exception thrown when a Bitrix API operation fails.
/// </summary>
public sealed class BitrixApiException : Exception
{
    /// <summary>
    /// The HTTP status code from the Bitrix API response, if available.
    /// </summary>
    public HttpStatusCode StatusCode { get; }

    /// <summary>
    /// The Bitrix error code, if returned in the response body.
    /// </summary>
    public string? BitrixErrorCode { get; }

    /// <summary>
    /// The Bitrix error description, if returned in the response body.
    /// </summary>
    public string? BitrixErrorDescription { get; }

    public BitrixApiException(string message)
        : base(message)
    {
        StatusCode = HttpStatusCode.InternalServerError;
    }

    public BitrixApiException(string message, Exception? innerException)
        : base(message, innerException)
    {
        StatusCode = HttpStatusCode.InternalServerError;
    }

    public BitrixApiException(string message, HttpStatusCode statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public BitrixApiException(string message, HttpStatusCode statusCode, string? errorCode, string? errorDescription)
        : base(message)
    {
        StatusCode = statusCode;
        BitrixErrorCode = errorCode;
        BitrixErrorDescription = errorDescription;
    }
}
