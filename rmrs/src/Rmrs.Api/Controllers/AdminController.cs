using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;
using Rmrs.Infrastructure.Services;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Controller for system administration: configuration management,
/// lookup table management, and scheduled job management.
/// Implements Requirements 13.1, 13.2, 13.4, 13.5, 13.6.
/// </summary>
[Authorize(Policy = PolicyNames.RequireSystemAdmin)]
public class AdminController : RmrsControllerBase
{
    private readonly IConfigurationService _configurationService;
    private readonly ILookupTableService _lookupTableService;
    private readonly IScheduledJobService _scheduledJobService;

    public AdminController(
        IUserContext userContext,
        IConfigurationService configurationService,
        ILookupTableService lookupTableService,
        IScheduledJobService scheduledJobService)
        : base(userContext)
    {
        _configurationService = configurationService;
        _lookupTableService = lookupTableService;
        _scheduledJobService = scheduledJobService;
    }

    // ─── Configuration Endpoints ───────────────────────────────────────

    /// <summary>
    /// Gets all system configuration settings.
    /// </summary>
    [HttpGet("/api/v1/admin/config")]
    [ProducesResponseType(typeof(IEnumerable<ConfigSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllConfig()
    {
        var settings = await _configurationService.GetAllSettingsAsync();
        return OkResponse(settings);
    }

    /// <summary>
    /// Updates a system configuration setting.
    /// Validates the value before applying and records the change in the audit log
    /// with previous value, new value, and reason.
    /// </summary>
    /// <param name="key">The configuration key to update.</param>
    /// <param name="request">The update request with new value and reason.</param>
    [HttpPut("/api/v1/admin/config/{key}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateConfig([FromRoute] string key, [FromBody] UpdateConfigRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (string.IsNullOrWhiteSpace(request.Value))
            return BadRequestResponse("Value is required.");

        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequestResponse("Reason for change is required.");

        try
        {
            await _configurationService.UpdateSettingAsync(key, request.Value, CurrentUser.UserId, request.Reason);
            return NoContentResponse();
        }
        catch (ConfigurationValidationException ex)
        {
            return BadRequestResponse("Configuration validation failed.", string.Join("; ", ex.ValidationErrors));
        }
    }

    // ─── Lookup Table Endpoints ────────────────────────────────────────

    /// <summary>
    /// Gets all lookup values for a specified type.
    /// Valid types: RecordType, ClassificationLevel, StorageLocation, Department, DisposalAuthority
    /// </summary>
    /// <param name="type">The lookup type.</param>
    [HttpGet("/api/v1/admin/lookups/{type}")]
    [ProducesResponseType(typeof(IEnumerable<LookupValueDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetLookupsByType([FromRoute] string type)
    {
        try
        {
            var values = await _lookupTableService.GetByTypeAsync(type);
            return OkResponse(values);
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Creates a new lookup value for the specified type.
    /// </summary>
    /// <param name="type">The lookup type.</param>
    /// <param name="request">The create request.</param>
    [HttpPost("/api/v1/admin/lookups/{type}")]
    [ProducesResponseType(typeof(LookupValueDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateLookup([FromRoute] string type, [FromBody] CreateLookupRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var createRequest = new CreateLookupValueRequest
            {
                LookupType = type,
                Code = request.Code,
                DisplayName = request.DisplayName,
                SortOrder = request.SortOrder,
                IsActive = request.IsActive
            };

            var result = await _lookupTableService.CreateAsync(createRequest);
            return CreatedResponse(nameof(GetLookupByCode), new { type, code = result.Code }, result);
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
    /// Gets a single lookup value by type and code.
    /// </summary>
    /// <param name="type">The lookup type.</param>
    /// <param name="code">The value code.</param>
    [HttpGet("/api/v1/admin/lookups/{type}/{code}")]
    [ProducesResponseType(typeof(LookupValueDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLookupByCode([FromRoute] string type, [FromRoute] string code)
    {
        try
        {
            var value = await _lookupTableService.GetByTypeAndCodeAsync(type, code);
            if (value == null)
                return NotFoundResponse($"Lookup value with type '{type}' and code '{code}' not found.");

            return OkResponse(value);
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Updates an existing lookup value.
    /// </summary>
    /// <param name="type">The lookup type.</param>
    /// <param name="code">The value code to update.</param>
    /// <param name="request">The update request.</param>
    [HttpPut("/api/v1/admin/lookups/{type}/{code}")]
    [ProducesResponseType(typeof(LookupValueDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLookup(
        [FromRoute] string type, [FromRoute] string code, [FromBody] UpdateLookupRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var updateRequest = new UpdateLookupValueRequest
            {
                DisplayName = request.DisplayName,
                SortOrder = request.SortOrder,
                IsActive = request.IsActive
            };

            var result = await _lookupTableService.UpdateAsync(type, code, updateRequest);
            return OkResponse(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    // ─── Scheduled Job Endpoints ───────────────────────────────────────

    /// <summary>
    /// Gets all scheduled job configurations.
    /// </summary>
    [HttpGet("/api/v1/admin/jobs")]
    [ProducesResponseType(typeof(IEnumerable<ScheduledJobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllJobs()
    {
        var jobs = await _scheduledJobService.GetAllJobsAsync();
        return OkResponse(jobs);
    }

    /// <summary>
    /// Gets a specific scheduled job configuration.
    /// </summary>
    /// <param name="id">The job ID.</param>
    [HttpGet("/api/v1/admin/jobs/{id}")]
    [ProducesResponseType(typeof(ScheduledJobDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJob([FromRoute] string id)
    {
        var job = await _scheduledJobService.GetJobByIdAsync(id);
        if (job == null)
            return NotFoundResponse($"Scheduled job '{id}' not found.");

        return OkResponse(job);
    }

    /// <summary>
    /// Updates a scheduled job's configuration.
    /// </summary>
    /// <param name="id">The job ID to update.</param>
    /// <param name="request">The update request.</param>
    [HttpPut("/api/v1/admin/jobs/{id}")]
    [ProducesResponseType(typeof(ScheduledJobDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateJob([FromRoute] string id, [FromBody] UpdateScheduledJobRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var result = await _scheduledJobService.UpdateJobAsync(id, request);
            return OkResponse(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────

/// <summary>
/// Request body for updating a configuration setting.
/// </summary>
public class UpdateConfigRequest
{
    /// <summary>The new configuration value.</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>Reason for the change (required for audit logging).</summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Request body for creating a lookup value.
/// </summary>
public class CreateLookupRequest
{
    /// <summary>Unique code for the lookup value within its type.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name shown to users.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Sort order for display purposes.</summary>
    public int SortOrder { get; set; }

    /// <summary>Whether the value is active. Defaults to true.</summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Request body for updating a lookup value.
/// </summary>
public class UpdateLookupRequest
{
    /// <summary>Updated display name (optional).</summary>
    public string? DisplayName { get; set; }

    /// <summary>Updated sort order (optional).</summary>
    public int? SortOrder { get; set; }

    /// <summary>Updated active status (optional).</summary>
    public bool? IsActive { get; set; }
}
