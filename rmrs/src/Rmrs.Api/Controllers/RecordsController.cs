using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;
using Rmrs.Domain.Entities;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Records Registry Controller — manages registration of incoming, outgoing, and internal records.
/// Auto-generates unique registry numbers following the pattern RMRS/{DEPT}/{YYYY}/{SEQ:00000}.
/// </summary>
[Authorize(Policy = PolicyNames.CanRegisterRecords)]
public class RecordsController : RmrsControllerBase
{
    private readonly IRecordRegistrationService _registrationService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<RecordsController> _logger;

    public RecordsController(
        IUserContext userContext,
        IRecordRegistrationService registrationService,
        IAuditLogService auditLogService,
        ILogger<RecordsController> logger)
        : base(userContext)
    {
        _registrationService = registrationService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Registers a new incoming record with auto-generated registry number.
    /// Captures external reference number, originating organization, and correspondence date.
    /// </summary>
    [HttpPost("incoming")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterIncoming([FromBody] RegisterIncomingRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var record = await _registrationService.RegisterIncomingAsync(request);

            var response = MapToResponse(record);
            return CreatedResponse(nameof(GetById), new { id = record.Id }, response);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Registers a new outgoing record with auto-generated registry number.
    /// </summary>
    [HttpPost("outgoing")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterOutgoing([FromBody] RegisterOutgoingRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var record = await _registrationService.RegisterOutgoingAsync(request);

            var response = MapToResponse(record);
            return CreatedResponse(nameof(GetById), new { id = record.Id }, response);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Registers a new internal record with auto-generated registry number.
    /// </summary>
    [HttpPost("internal")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterInternal([FromBody] RegisterInternalRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var record = await _registrationService.RegisterInternalAsync(request);

            var response = MapToResponse(record);
            return CreatedResponse(nameof(GetById), new { id = record.Id }, response);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Updates an existing record's metadata.
    /// Registry number cannot be changed.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRecordRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var record = await _registrationService.UpdateRecordAsync(id, request);

            var response = MapToResponse(record);
            return OkResponse(response);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Gets a record by its ID, including related entities.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [AllowAnonymous] // Access control handled at service level based on user context
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _registrationService.GetRecordByIdAsync(id);

        if (record == null)
            return NotFoundResponse($"Record with ID '{id}' was not found.");

        var response = MapToDetailResponse(record);
        return OkResponse(response);
    }

    /// <summary>
    /// Returns the audit trail (history) for a specific record.
    /// Queries audit logs filtered by EntityType='Record' and EntityId matching the record ID.
    /// </summary>
    [HttpGet("{id:int}/history")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRecordHistory(int id)
    {
        // Verify the record exists
        var record = await _registrationService.GetRecordByIdAsync(id);
        if (record == null)
            return NotFoundResponse($"Record with ID '{id}' was not found.");

        // Query audit logs for this record
        var auditQuery = new AuditQuery
        {
            EntityType = "Record",
            EntityId = id,
            Take = 500 // Return up to 500 history entries
        };

        var auditLogs = await _auditLogService.QueryAsync(auditQuery);

        var response = auditLogs.Select(log => new RecordHistoryEntry
        {
            Id = log.Id,
            UserId = log.UserId,
            Timestamp = log.Timestamp,
            ActionType = log.ActionType,
            PreviousValue = log.PreviousValue,
            NewValue = log.NewValue,
            SourceIpAddress = log.SourceIpAddress
        });

        return OkResponse(response);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ────────────────────────────────────────────────────────────────────────

    private static RecordResponse MapToResponse(Record record)
    {
        return new RecordResponse
        {
            Id = record.Id,
            RegistryNumber = record.RegistryNumber,
            RecordType = record.RecordType,
            Subject = record.Subject,
            SenderOrRecipient = record.SenderOrRecipient,
            DateReceivedOrSent = record.DateReceivedOrSent,
            FilePlanEntryId = record.FilePlanEntryId,
            ClassificationLevel = record.ClassificationLevel,
            ResponsibleOfficerId = record.ResponsibleOfficerId,
            DepartmentId = record.DepartmentId,
            ExternalReferenceNumber = record.ExternalReferenceNumber,
            OriginatingOrganization = record.OriginatingOrganization,
            CorrespondenceDate = record.CorrespondenceDate,
            Status = record.Status,
            RetentionExpiryDate = record.RetentionExpiryDate,
            CreatedByUserId = record.CreatedByUserId,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt
        };
    }

    private static RecordDetailResponse MapToDetailResponse(Record record)
    {
        return new RecordDetailResponse
        {
            Id = record.Id,
            RegistryNumber = record.RegistryNumber,
            RecordType = record.RecordType,
            Subject = record.Subject,
            SenderOrRecipient = record.SenderOrRecipient,
            DateReceivedOrSent = record.DateReceivedOrSent,
            FilePlanEntryId = record.FilePlanEntryId,
            FilePlanClassificationCode = record.FilePlanEntry?.ClassificationCode,
            FilePlanTitle = record.FilePlanEntry?.Title,
            ClassificationLevel = record.ClassificationLevel,
            ResponsibleOfficerId = record.ResponsibleOfficerId,
            ResponsibleOfficerName = record.ResponsibleOfficer?.FullName,
            DepartmentId = record.DepartmentId,
            DepartmentCode = record.Department?.DepartmentCode,
            DepartmentName = record.Department?.DepartmentName,
            ExternalReferenceNumber = record.ExternalReferenceNumber,
            OriginatingOrganization = record.OriginatingOrganization,
            CorrespondenceDate = record.CorrespondenceDate,
            Status = record.Status,
            RetentionExpiryDate = record.RetentionExpiryDate,
            CreatedByUserId = record.CreatedByUserId,
            CreatedByUserName = record.CreatedByUser?.FullName,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt
        };
    }
}

// ────────────────────────────────────────────────────────────────────────
// Request/Response DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Response model for record operations (create/update).
/// </summary>
public class RecordResponse
{
    public int Id { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? SenderOrRecipient { get; set; }
    public DateTime DateReceivedOrSent { get; set; }
    public int FilePlanEntryId { get; set; }
    public int ClassificationLevel { get; set; }
    public int ResponsibleOfficerId { get; set; }
    public int DepartmentId { get; set; }
    public string? ExternalReferenceNumber { get; set; }
    public string? OriginatingOrganization { get; set; }
    public DateTime? CorrespondenceDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? RetentionExpiryDate { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Detailed response model for GET record by ID, including related entity data.
/// </summary>
public class RecordDetailResponse : RecordResponse
{
    public string? FilePlanClassificationCode { get; set; }
    public string? FilePlanTitle { get; set; }
    public string? ResponsibleOfficerName { get; set; }
    public string? DepartmentCode { get; set; }
    public string? DepartmentName { get; set; }
    public string? CreatedByUserName { get; set; }
}

/// <summary>
/// Response model for a single audit trail entry in the record history.
/// </summary>
public class RecordHistoryEntry
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? PreviousValue { get; set; }
    public string? NewValue { get; set; }
    public string SourceIpAddress { get; set; } = string.Empty;
}
