using Microsoft.AspNetCore.Mvc.Controllers;
using Rmrs.Application.Security;

namespace Rmrs.Api.Middleware;

/// <summary>
/// Middleware that challenges re-authentication for sensitive operations.
/// When an endpoint is decorated with [RequiresReAuthentication], this middleware
/// checks for a valid re-authentication token/header before allowing the request to proceed.
/// 
/// Sensitive operations requiring re-authentication include:
/// - Disposal approval
/// - Role assignment changes
/// - System configuration modifications
/// 
/// Implements Requirement 10.5.
/// </summary>
public class ReAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ReAuthenticationMiddleware> _logger;

    /// <summary>
    /// Header name that the client must provide with a valid re-authentication token.
    /// </summary>
    public const string ReAuthHeaderName = "X-ReAuth-Token";

    public ReAuthenticationMiddleware(RequestDelegate next, ILogger<ReAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        var actionDescriptor = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();

        // Check if the endpoint or its controller has the RequiresReAuthentication attribute
        var requiresReAuth = endpoint?.Metadata.GetMetadata<RequiresReAuthenticationAttribute>();

        if (requiresReAuth != null)
        {
            // Check for the re-authentication header/token
            var reAuthToken = context.Request.Headers[ReAuthHeaderName].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(reAuthToken))
            {
                _logger.LogWarning(
                    "Re-authentication required for endpoint {Endpoint} but no {Header} header provided. User: {UserId}",
                    actionDescriptor?.ActionName ?? "unknown",
                    ReAuthHeaderName,
                    context.Session.GetInt32("UserId"));

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    Code = "RE_AUTHENTICATION_REQUIRED",
                    Message = "This operation requires re-authentication. Please provide your credentials again.",
                    Detail = requiresReAuth.Reason ?? "Sensitive operation detected.",
                    TraceId = context.TraceIdentifier
                });
                return;
            }

            // Validate the re-auth token is a valid session re-authentication
            // In a production system this would verify the token against a short-lived
            // re-auth challenge stored server-side. For this implementation, we validate
            // the token matches the current session's re-auth challenge.
            var storedReAuthToken = context.Session.GetString("ReAuthToken");
            if (storedReAuthToken == null || storedReAuthToken != reAuthToken)
            {
                _logger.LogWarning(
                    "Invalid re-authentication token provided for endpoint {Endpoint}. User: {UserId}",
                    actionDescriptor?.ActionName ?? "unknown",
                    context.Session.GetInt32("UserId"));

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    Code = "RE_AUTHENTICATION_FAILED",
                    Message = "Re-authentication failed. The provided token is invalid or expired.",
                    TraceId = context.TraceIdentifier
                });
                return;
            }

            // Clear the re-auth token after use (single-use)
            context.Session.Remove("ReAuthToken");

            _logger.LogInformation(
                "Re-authentication validated for endpoint {Endpoint}. User: {UserId}",
                actionDescriptor?.ActionName ?? "unknown",
                context.Session.GetInt32("UserId"));
        }

        await _next(context);
    }
}

/// <summary>
/// Extension methods for registering the ReAuthenticationMiddleware.
/// </summary>
public static class ReAuthenticationMiddlewareExtensions
{
    /// <summary>
    /// Adds the re-authentication middleware to the pipeline.
    /// Should be placed after authentication/authorization middleware.
    /// </summary>
    public static IApplicationBuilder UseReAuthentication(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ReAuthenticationMiddleware>();
    }
}
