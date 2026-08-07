using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Manages department-to-Bitrix workgroup drive mappings.
/// All mappings are stored in the database and fully configurable at runtime
/// through this API — no hardcoded values. Admins can add, change, or remove
/// workgroup mappings at any time without code changes or deployments.
/// All endpoints require SystemAdmin role.
/// </summary>
[Authorize(Policy = PolicyNames.RequireSystemAdmin)]
public class DepartmentsController : RmrsControllerBase
{
    private readonly IDepartmentMappingService _departmentMappingService;
    private readonly ILogger<DepartmentsController> _logger;

    public DepartmentsController(
        IUserContext userContext,
        IDepartmentMappingService departmentMappingService,
        ILogger<DepartmentsController> logger)
        : base(userContext)
    {
        _departmentMappingService = departmentMappingService;
        _logger = logger;
    }

    /// <summary>
    /// Returns all department mappings (active and inactive).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var mappings = await _departmentMappingService.GetAllMappingsAsync();

        var result = mappings.Select(d => new DepartmentMappingResponse
        {
            Id = d.Id,
            DepartmentCode = d.DepartmentCode,
            DepartmentName = d.DepartmentName,
            BitrixWorkgroupId = d.BitrixWorkgroupId,
            BitrixDriveId = d.BitrixDriveId,
            IsActive = d.IsActive,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        });

        return OkResponse(result);
    }

    /// <summary>
    /// Returns a single department mapping by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var department = await _departmentMappingService.GetMappingByIdAsync(id);

        if (department == null)
            return NotFoundResponse($"Department mapping with ID '{id}' was not found.");

        var result = new DepartmentMappingResponse
        {
            Id = department.Id,
            DepartmentCode = department.DepartmentCode,
            DepartmentName = department.DepartmentName,
            BitrixWorkgroupId = department.BitrixWorkgroupId,
            BitrixDriveId = department.BitrixDriveId,
            IsActive = department.IsActive,
            CreatedAt = department.CreatedAt,
            UpdatedAt = department.UpdatedAt
        };

        return OkResponse(result);
    }

    /// <summary>
    /// Creates a new department mapping. Validates the Bitrix workgroup exists before saving.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentMappingRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var department = await _departmentMappingService.CreateMappingAsync(
                request.DepartmentCode,
                request.DepartmentName,
                request.BitrixWorkgroupId,
                request.BitrixDriveId);

            var result = new DepartmentMappingResponse
            {
                Id = department.Id,
                DepartmentCode = department.DepartmentCode,
                DepartmentName = department.DepartmentName,
                BitrixWorkgroupId = department.BitrixWorkgroupId,
                BitrixDriveId = department.BitrixDriveId,
                IsActive = department.IsActive,
                CreatedAt = department.CreatedAt,
                UpdatedAt = department.UpdatedAt
            };

            return CreatedResponse(nameof(GetById), new { id = department.Id }, result);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during department mapping creation");
            return StatusCode(StatusCodes.Status502BadGateway, new Application.Models.ApiError
            {
                Code = "BITRIX_API_ERROR",
                Message = ex.Message,
                Detail = ex.Detail,
                TraceId = HttpContext.TraceIdentifier
            });
        }
    }

    /// <summary>
    /// Updates an existing department mapping. Re-validates Bitrix workgroup if the workgroup ID changes.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentMappingRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var department = await _departmentMappingService.UpdateMappingAsync(
                id,
                request.DepartmentName,
                request.BitrixWorkgroupId,
                request.BitrixDriveId);

            var result = new DepartmentMappingResponse
            {
                Id = department.Id,
                DepartmentCode = department.DepartmentCode,
                DepartmentName = department.DepartmentName,
                BitrixWorkgroupId = department.BitrixWorkgroupId,
                BitrixDriveId = department.BitrixDriveId,
                IsActive = department.IsActive,
                CreatedAt = department.CreatedAt,
                UpdatedAt = department.UpdatedAt
            };

            return OkResponse(result);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during department mapping update");
            return StatusCode(StatusCodes.Status502BadGateway, new Application.Models.ApiError
            {
                Code = "BITRIX_API_ERROR",
                Message = ex.Message,
                Detail = ex.Detail,
                TraceId = HttpContext.TraceIdentifier
            });
        }
    }

    /// <summary>
    /// Deletes a department mapping. Blocked if the department has associated records.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _departmentMappingService.DeleteMappingAsync(id);
            return NoContentResponse();
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Syncs departments from Bitrix workgroups.
    /// Fetches all workgroups from Bitrix and creates missing department mappings.
    /// Existing mappings (by BitrixWorkgroupId) are skipped.
    /// </summary>
    [HttpPost("sync-from-bitrix")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SyncFromBitrix()
    {
        try
        {
            var result = await _departmentMappingService.SyncFromBitrixAsync();
            return OkResponse(result);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during department sync");
            return StatusCode(StatusCodes.Status502BadGateway, new Application.Models.ApiError
            {
                Code = "BITRIX_API_ERROR",
                Message = ex.Message,
                Detail = ex.Detail,
                TraceId = HttpContext.TraceIdentifier
            });
        }
    }

    /// <summary>
    /// Validates that a Bitrix workgroup exists for the given department mapping.
    /// Calls Bitrix sonet_group.get to confirm the workgroup is accessible.
    /// </summary>
    [HttpPost("{id:int}/validate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ValidateWorkgroup(int id)
    {
        var department = await _departmentMappingService.GetMappingByIdAsync(id);

        if (department == null)
            return NotFoundResponse($"Department mapping with ID '{id}' was not found.");

        try
        {
            var isValid = await _departmentMappingService.ValidateWorkgroupAsync(department.BitrixWorkgroupId);

            return OkResponse(new WorkgroupValidationResponse
            {
                DepartmentId = department.Id,
                DepartmentCode = department.DepartmentCode,
                BitrixWorkgroupId = department.BitrixWorkgroupId,
                IsValid = isValid,
                Message = isValid
                    ? "Bitrix workgroup exists and is accessible."
                    : "Bitrix workgroup was not found or is not accessible."
            });
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during workgroup validation for department {DepartmentId}", id);
            return StatusCode(StatusCodes.Status502BadGateway, new Application.Models.ApiError
            {
                Code = "BITRIX_API_ERROR",
                Message = ex.Message,
                Detail = ex.Detail,
                TraceId = HttpContext.TraceIdentifier
            });
        }
    }
}

// ────────────────────────────────────────────────────────────────────────
// Request/Response DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Request model for creating a new department mapping.
/// </summary>
public class CreateDepartmentMappingRequest
{
    /// <summary>
    /// Unique department code identifier (e.g., "FIN", "HR", "IT").
    /// </summary>
    public string DepartmentCode { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable department name.
    /// </summary>
    public string DepartmentName { get; set; } = string.Empty;

    /// <summary>
    /// The Bitrix workgroup ID to map this department to.
    /// </summary>
    public int BitrixWorkgroupId { get; set; }

    /// <summary>
    /// The Bitrix drive ID associated with the workgroup.
    /// </summary>
    public int BitrixDriveId { get; set; }
}

/// <summary>
/// Request model for updating an existing department mapping.
/// Note: DepartmentCode cannot be changed after creation.
/// </summary>
public class UpdateDepartmentMappingRequest
{
    /// <summary>
    /// Updated human-readable department name.
    /// </summary>
    public string DepartmentName { get; set; } = string.Empty;

    /// <summary>
    /// Updated Bitrix workgroup ID. If changed, will be re-validated against Bitrix API.
    /// </summary>
    public int BitrixWorkgroupId { get; set; }

    /// <summary>
    /// Updated Bitrix drive ID.
    /// </summary>
    public int BitrixDriveId { get; set; }
}

/// <summary>
/// Response model for department mapping operations.
/// </summary>
public class DepartmentMappingResponse
{
    public int Id { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int BitrixWorkgroupId { get; set; }
    public int BitrixDriveId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Response model for workgroup validation endpoint.
/// </summary>
public class WorkgroupValidationResponse
{
    public int DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public int BitrixWorkgroupId { get; set; }
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
}
