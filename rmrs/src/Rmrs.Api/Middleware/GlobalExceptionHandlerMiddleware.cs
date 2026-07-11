using System.Net;
using System.Text.Json;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Models;

namespace Rmrs.Api.Middleware;

/// <summary>
/// Global exception handler middleware that catches unhandled exceptions
/// and returns a standardized ApiError response matching the design document format.
/// 
/// Error Categories:
/// - Validation Error: 400
/// - Authentication Error: 401
/// - Authorization Error: 403
/// - Not Found: 404
/// - Conflict: 409
/// - Rate Limited: 429
/// - Bitrix API Error: 502
/// - Server Error: 500
/// </summary>
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred. TraceId: {TraceId}", context.TraceIdentifier);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, errorCode, message, detail) = MapException(exception);

        context.Response.StatusCode = (int)statusCode;

        var apiError = new ApiError
        {
            Code = errorCode,
            Message = message,
            Detail = detail,
            TraceId = context.TraceIdentifier
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(apiError, jsonOptions));
    }

    private static (HttpStatusCode StatusCode, string ErrorCode, string Message, string? Detail) MapException(Exception exception)
    {
        return exception switch
        {
            // RMRS Application layer exceptions
            Rmrs.Application.Exceptions.ValidationException validationEx =>
                (HttpStatusCode.BadRequest, validationEx.ErrorCode, validationEx.Message, validationEx.Detail),

            Rmrs.Application.Exceptions.AuthenticationException authNEx =>
                (HttpStatusCode.Unauthorized, authNEx.ErrorCode, authNEx.Message, authNEx.Detail),

            Rmrs.Application.Exceptions.AuthorizationException authZEx =>
                (HttpStatusCode.Forbidden, authZEx.ErrorCode, authZEx.Message, authZEx.Detail),

            Rmrs.Application.Exceptions.NotFoundException notFoundEx =>
                (HttpStatusCode.NotFound, notFoundEx.ErrorCode, notFoundEx.Message, notFoundEx.Detail),

            Rmrs.Application.Exceptions.ConflictException conflictEx =>
                (HttpStatusCode.Conflict, conflictEx.ErrorCode, conflictEx.Message, conflictEx.Detail),

            Rmrs.Application.Exceptions.RateLimitedException rateLimitedEx =>
                ((HttpStatusCode)429, rateLimitedEx.ErrorCode, rateLimitedEx.Message, rateLimitedEx.Detail),

            Rmrs.Application.Exceptions.BitrixApiException bitrixAppEx =>
                (HttpStatusCode.BadGateway, bitrixAppEx.ErrorCode, bitrixAppEx.Message, bitrixAppEx.Detail),

            // Infrastructure Bitrix exception (from BitrixApiClient)
            Rmrs.Infrastructure.Services.Bitrix.BitrixApiException bitrixInfraEx =>
                (HttpStatusCode.BadGateway, ApiErrorCodes.BitrixApiError,
                    bitrixInfraEx.Message,
                    bitrixInfraEx.BitrixErrorDescription),

            // Fallback mappings for standard .NET exceptions
            UnauthorizedAccessException =>
                (HttpStatusCode.Forbidden, ApiErrorCodes.AuthorizationError, "Access denied.", null),

            ArgumentException argEx =>
                (HttpStatusCode.BadRequest, ApiErrorCodes.ValidationError, argEx.Message, null),

            KeyNotFoundException =>
                (HttpStatusCode.NotFound, ApiErrorCodes.NotFound, "The requested resource was not found.", null),

            InvalidOperationException opEx =>
                (HttpStatusCode.Conflict, ApiErrorCodes.Conflict, opEx.Message, null),

            OperationCanceledException =>
                ((HttpStatusCode)499, "REQUEST_CANCELLED", "The request was cancelled.", null),

            _ =>
                (HttpStatusCode.InternalServerError, ApiErrorCodes.ServerError,
                    "An unexpected error occurred. Please try again later.", null)
        };
    }
}
