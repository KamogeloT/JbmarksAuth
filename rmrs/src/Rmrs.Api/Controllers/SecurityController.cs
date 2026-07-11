using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Controller for managing user role assignments and security operations.
/// All endpoints require the CanAssignRoles policy (SystemAdministrator only).
/// Implements Requirements 10.4, 10.5, 10.6.
/// </summary>
[Authorize(Policy = PolicyNames.CanAssignRoles)]
public class SecurityController : RmrsControllerBase
{
    private readonly IRoleService _roleService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<SecurityController> _logger;

    public SecurityController(
        IUserContext userContext,
        IRoleService roleService,
        IAuditLogService auditLogService,
        ILogger<SecurityController> logger)
        : base(userContext)
    {
        _roleService = roleService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all active role assignments for a specific user.
    /// </summary>
    /// <param name="id">The user ID to query.</param>
    /// <returns>Collection of active role assignments.</returns>
    [HttpGet("/api/v1/users/{id:int}/roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserRoles(int id)
    {
        var roles = await _roleService.GetUserRolesAsync(id);

        var response = roles.Select(r => new
        {
            r.Id,
            r.UserId,
            r.RoleName,
            r.EffectiveDate,
            r.AssignedByUserId,
            r.Justification,
            r.IsActive,
            r.CreatedAt
        });

        return OkResponse(response);
    }

    /// <summary>
    /// Assigns a new role to a user. Requires justification.
    /// This is a sensitive operation that requires re-authentication.
    /// </summary>
    /// <param name="id">The user ID to assign the role to.</param>
    /// <param name="request">The role assignment details including role name, effective date, and justification.</param>
    /// <returns>The created role assignment.</returns>
    [HttpPost("/api/v1/users/{id:int}/roles")]
    [RequiresReAuthentication("Role assignment is a sensitive security operation")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignRole(int id, [FromBody] AssignRoleRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.RoleName))
        {
            return BadRequestResponse("Role name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Justification))
        {
            return BadRequestResponse("Justification is required for role assignment.");
        }

        try
        {
            var assignRequest = new AssignRoleRequest
            {
                UserId = id,
                RoleName = request.RoleName,
                EffectiveDate = request.EffectiveDate ?? DateTime.UtcNow,
                Justification = request.Justification
            };

            var result = await _roleService.AssignRoleAsync(assignRequest, CurrentUser.UserId);

            return CreatedResponse(
                nameof(GetUserRoles),
                new { id },
                new
                {
                    result.Id,
                    result.UserId,
                    result.RoleName,
                    result.EffectiveDate,
                    result.AssignedByUserId,
                    result.Justification,
                    result.IsActive,
                    result.CreatedAt
                });
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictResponse(ex.Message);
        }
    }

    /// <summary>
    /// Revokes (deactivates) a role from a user.
    /// This is a sensitive operation that requires re-authentication.
    /// </summary>
    /// <param name="id">The user ID to revoke the role from.</param>
    /// <param name="roleName">The role name to revoke.</param>
    /// <returns>No content on success.</returns>
    [HttpDelete("/api/v1/users/{id:int}/roles/{roleName}")]
    [RequiresReAuthentication("Role revocation is a sensitive security operation")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeRole(int id, string roleName)
    {
        try
        {
            await _roleService.RevokeRoleAsync(id, roleName, CurrentUser.UserId);
            return NoContentResponse();
        }
        catch (InvalidOperationException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    /// <summary>
    /// Logs an unauthorized classification access attempt.
    /// Called internally when a user tries to access a record beyond their classification level.
    /// Records user ID, record ID, timestamp, and action attempted.
    /// Implements Requirement 10.6.
    /// </summary>
    /// <param name="request">The unauthorized access details.</param>
    [HttpPost("/api/v1/security/log-unauthorized-access")]
    [AllowAnonymous] // This endpoint is called internally by the system
    [ApiExplorerSettings(IgnoreApi = true)] // Hide from Swagger
    public async Task<IActionResult> LogUnauthorizedAccess([FromBody] UnauthorizedAccessLogRequest request)
    {
        await _auditLogService.LogAsync(new AuditEntry(
            UserId: request.UserId,
            ActionType: "UnauthorizedClassificationAccess",
            EntityType: "Record",
            EntityId: request.RecordId,
            PreviousValue: null,
            NewValue: $"Attempted action: {request.Action}. User classification level insufficient.",
            SourceIpAddress: request.IpAddress
        ));

        _logger.LogWarning(
            "Unauthorized classification access attempt: User {UserId} tried to {Action} record {RecordId}",
            request.UserId, request.Action, request.RecordId);

        return Ok();
    }
}

/// <summary>
/// DTO for the role assignment request body.
/// </summary>
public class AssignRoleRequestDto
{
    /// <summary>
    /// The role name to assign. Must be one of the 9 system roles.
    /// </summary>
    public string RoleName { get; set; } = string.Empty;

    /// <summary>
    /// The date from which the role becomes effective. Defaults to current date if not specified.
    /// </summary>
    public DateTime? EffectiveDate { get; set; }

    /// <summary>
    /// Justification for the role assignment (required).
    /// </summary>
    public string Justification { get; set; } = string.Empty;
}

/// <summary>
/// Request model for logging unauthorized classification access attempts.
/// </summary>
public class UnauthorizedAccessLogRequest
{
    /// <summary>
    /// The user who attempted unauthorized access.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// The record that was attempted to be accessed.
    /// </summary>
    public int RecordId { get; set; }

    /// <summary>
    /// The action that was attempted (e.g., "Read", "Download", "Update").
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// The IP address of the user making the attempt.
    /// </summary>
    public string IpAddress { get; set; } = string.Empty;
}
