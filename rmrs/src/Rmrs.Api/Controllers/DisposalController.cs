using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// API controller for disposal workflow operations.
/// Provides endpoints for disposal candidates, batch management, approval, execution, and certificate download.
/// Implements Requirements 7.1 - 7.7.
/// </summary>
[Authorize]
public class DisposalController : RmrsControllerBase
{
    private readonly IDisposalWorkflowService _disposalService;
    private readonly ILogger<DisposalController> _logger;

    public DisposalController(
        IUserContext userContext,
        IDisposalWorkflowService disposalService,
        ILogger<DisposalController> logger)
        : base(userContext)
    {
        _disposalService = disposalService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/v1/disposal/candidates
    /// Lists all records past their retention expiry date and eligible for disposal.
    /// Disposal certificates and audit logs are never included.
    /// </summary>
    [HttpGet("candidates")]
    [Authorize(Policy = PolicyNames.CanDispose)]
    public async Task<IActionResult> GetDisposalCandidates()
    {
        var candidates = await _disposalService.GetDisposalCandidatesAsync();

        var response = candidates.Select(r => new
        {
            r.Id,
            r.RegistryNumber,
            r.Subject,
            r.RecordType,
            DepartmentName = r.Department?.DepartmentName,
            r.RetentionExpiryDate,
            r.Status,
            FilePlanClassification = r.FilePlanEntry?.ClassificationCode
        });

        return OkResponse(response);
    }

    /// <summary>
    /// POST /api/v1/disposal/batches
    /// Creates a new disposal batch. Requires Records_Manager role (CanDispose policy).
    /// </summary>
    [HttpPost("batches")]
    [Authorize(Policy = PolicyNames.CanDispose)]
    public async Task<IActionResult> CreateDisposalBatch([FromBody] CreateDisposalBatchRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (request.RecordIds == null || request.RecordIds.Count == 0)
            return BadRequestResponse("At least one record ID must be specified.");

        if (string.IsNullOrWhiteSpace(request.DisposalAuthorityRef))
            return BadRequestResponse("A valid Disposal Authority reference is required.");

        try
        {
            var initiateRequest = new InitiateDisposalRequest
            {
                RecordIds = request.RecordIds,
                DisposalAuthorityRef = request.DisposalAuthorityRef
            };

            var batch = await _disposalService.InitiateDisposalAsync(initiateRequest, CurrentUser.UserId);

            return CreatedResponse(nameof(GetDisposalBatch), new { id = batch.Id }, new
            {
                batch.Id,
                batch.BatchNumber,
                batch.DisposalAuthorityRef,
                batch.Status,
                batch.InitiatedByUserId,
                batch.InitiatedAt,
                RecordCount = request.RecordIds.Count
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// GET /api/v1/disposal/batches/{id}
    /// Gets the details of a specific disposal batch.
    /// </summary>
    [HttpGet("batches/{id:int}")]
    [Authorize(Policy = PolicyNames.CanDispose)]
    public async Task<IActionResult> GetDisposalBatch(int id)
    {
        var batch = await _disposalService.GetBatchAsync(id);

        if (batch == null)
            return NotFoundResponse($"Disposal batch with ID {id} not found.");

        var response = new
        {
            batch.Id,
            batch.BatchNumber,
            batch.DisposalAuthorityRef,
            batch.Status,
            InitiatedBy = batch.InitiatedByUser?.FullName,
            batch.InitiatedByUserId,
            batch.InitiatedAt,
            ApprovedBy = batch.ApprovedByUser?.FullName,
            batch.ApprovedByUserId,
            batch.ApprovedAt,
            batch.ExecutedAt,
            batch.CertificateGenerated,
            Records = batch.DisposalBatchRecords?.Select(br => new
            {
                br.RecordId,
                br.Record?.RegistryNumber,
                br.Record?.Subject,
                br.DisposalStatus
            })
        };

        return OkResponse(response);
    }

    /// <summary>
    /// POST /api/v1/disposal/batches/{id}/approve
    /// Approves a disposal batch. Requires Compliance_Officer role and re-authentication.
    /// </summary>
    [HttpPost("batches/{id:int}/approve")]
    [Authorize(Policy = PolicyNames.CanApproveDisposal)]
    public async Task<IActionResult> ApproveDisposalBatch(int id)
    {
        try
        {
            var batch = await _disposalService.ApproveDisposalAsync(id, CurrentUser.UserId);

            return OkResponse(new
            {
                batch.Id,
                batch.BatchNumber,
                batch.Status,
                ApprovedBy = CurrentUser.FullName,
                batch.ApprovedAt
            });
        }
        catch (ArgumentException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// POST /api/v1/disposal/batches/{id}/execute
    /// Executes an approved disposal batch. Deletes files from Bitrix, retains metadata.
    /// If Bitrix deletion fails, marks records as "disposal pending".
    /// </summary>
    [HttpPost("batches/{id:int}/execute")]
    [Authorize(Policy = PolicyNames.CanDispose)]
    public async Task<IActionResult> ExecuteDisposalBatch(int id)
    {
        try
        {
            await _disposalService.ExecuteDisposalAsync(id);

            var batch = await _disposalService.GetBatchAsync(id);

            return OkResponse(new
            {
                batch!.Id,
                batch.BatchNumber,
                batch.Status,
                batch.ExecutedAt,
                batch.CertificateGenerated,
                Records = batch.DisposalBatchRecords?.Select(br => new
                {
                    br.RecordId,
                    br.Record?.RegistryNumber,
                    br.DisposalStatus
                })
            });
        }
        catch (ArgumentException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// GET /api/v1/disposal/batches/{id}/certificate
    /// Downloads the disposal certificate PDF for a completed batch.
    /// </summary>
    [HttpGet("batches/{id:int}/certificate")]
    [Authorize(Policy = PolicyNames.CanDispose)]
    public async Task<IActionResult> DownloadCertificate(int id)
    {
        var certificate = await _disposalService.GetCertificateAsync(id);

        if (certificate == null)
            return NotFoundResponse($"No disposal certificate found for batch ID {id}.");

        return File(
            certificate.CertificateData,
            "application/pdf",
            $"DisposalCertificate-{certificate.CertificateNumber}.pdf");
    }
}

/// <summary>
/// Request model for creating a disposal batch via the API.
/// </summary>
public class CreateDisposalBatchRequest
{
    /// <summary>
    /// The IDs of records to include in the disposal batch.
    /// </summary>
    public List<int> RecordIds { get; set; } = new();

    /// <summary>
    /// Reference to the approved Disposal Authority permitting destruction.
    /// </summary>
    public string DisposalAuthorityRef { get; set; } = string.Empty;
}
