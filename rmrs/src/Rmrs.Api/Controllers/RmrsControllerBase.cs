using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Models;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Base controller for all RMRS API controllers.
/// Provides access to the current user context and common action result helpers.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public abstract class RmrsControllerBase : ControllerBase
{
    /// <summary>
    /// The current authenticated user's context.
    /// </summary>
    protected IUserContext CurrentUser { get; }

    protected RmrsControllerBase(IUserContext userContext)
    {
        CurrentUser = userContext;
    }

    /// <summary>
    /// Returns a 200 OK response with the provided data.
    /// </summary>
    protected IActionResult OkResponse<T>(T data)
    {
        return Ok(data);
    }

    /// <summary>
    /// Returns a 201 Created response with the provided data and location header.
    /// </summary>
    protected IActionResult CreatedResponse<T>(string actionName, object routeValues, T data)
    {
        return CreatedAtAction(actionName, routeValues, data);
    }

    /// <summary>
    /// Returns a 204 No Content response.
    /// </summary>
    protected IActionResult NoContentResponse()
    {
        return NoContent();
    }

    /// <summary>
    /// Returns a 400 Bad Request response with a standardized ApiError.
    /// </summary>
    protected IActionResult BadRequestResponse(string message, string? detail = null)
    {
        var error = new ApiError
        {
            Code = ApiErrorCodes.ValidationError,
            Message = message,
            Detail = detail,
            TraceId = HttpContext.TraceIdentifier
        };
        return BadRequest(error);
    }

    /// <summary>
    /// Returns a 404 Not Found response with a standardized ApiError.
    /// </summary>
    protected IActionResult NotFoundResponse(string message = "The requested resource was not found.", string? detail = null)
    {
        var error = new ApiError
        {
            Code = ApiErrorCodes.NotFound,
            Message = message,
            Detail = detail,
            TraceId = HttpContext.TraceIdentifier
        };
        return NotFound(error);
    }

    /// <summary>
    /// Returns a 403 Forbidden response with a standardized ApiError.
    /// </summary>
    protected IActionResult ForbiddenResponse(string message = "You do not have permission to perform this action.", string? detail = null)
    {
        var error = new ApiError
        {
            Code = ApiErrorCodes.AuthorizationError,
            Message = message,
            Detail = detail,
            TraceId = HttpContext.TraceIdentifier
        };
        return StatusCode(StatusCodes.Status403Forbidden, error);
    }

    /// <summary>
    /// Returns a 409 Conflict response with a standardized ApiError.
    /// </summary>
    protected IActionResult ConflictResponse(string message, string? detail = null)
    {
        var error = new ApiError
        {
            Code = ApiErrorCodes.Conflict,
            Message = message,
            Detail = detail,
            TraceId = HttpContext.TraceIdentifier
        };
        return Conflict(error);
    }

    /// <summary>
    /// Returns a paginated response with total count metadata.
    /// </summary>
    protected IActionResult PaginatedResponse<T>(IEnumerable<T> items, int totalCount, int page, int pageSize)
    {
        return Ok(new
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }
}
