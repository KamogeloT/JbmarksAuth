using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// API controller for archive transfer batch operations.
/// Manages the full transfer workflow: Create → Add Records → Validate → Finalize → Complete.
/// Only accessible by users with the Archivist role (CanManageArchiveTransfer policy).
/// Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5.
/// </summary>
[Authorize(Policy = PolicyNames.CanManageArchiveTransfer)]
[Route("api/v1/archive")]
public class ArchiveController : RmrsControllerBase
{
    private readonly ITransferBatchService _transferBatchService;

    public ArchiveController(
        IUserContext userContext,
        ITransferBatchService transferBatchService)
        : base(userContext)
    {
        _transferBatchService = transferBatchService ?? throw new ArgumentNullException(nameof(transferBatchService));
    }

    /// <summary>
    /// Creates a new archive transfer batch in Draft status.
    /// </summary>
    /// <param name="request">The batch creation request.</param>
    /// <returns>The created transfer batch.</returns>
    [HttpPost("batches")]
    [ProducesResponseType(typeof(TransferBatchDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBatch([FromBody] CreateTransferBatchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DestinationArchive))
            return BadRequestResponse("Destination archive is required.");

        var batch = await _transferBatchService.CreateBatchAsync(request);
        return CreatedAtAction(nameof(GetBatch), new { id = batch.Id }, batch);
    }

    /// <summary>
    /// Gets a transfer batch by ID.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <returns>The batch details.</returns>
    [HttpGet("batches/{id:int}")]
    [ProducesResponseType(typeof(TransferBatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBatch(int id)
    {
        var batch = await _transferBatchService.GetBatchAsync(id);
        if (batch == null)
            return NotFoundResponse($"Transfer batch with ID {id} not found.");

        return OkResponse(batch);
    }

    /// <summary>
    /// Adds records to an existing transfer batch.
    /// Records must have completed retention and be marked for archival transfer.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <param name="request">The request containing record IDs to add.</param>
    /// <returns>The updated batch.</returns>
    [HttpPost("batches/{id:int}/records")]
    [ProducesResponseType(typeof(TransferBatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddRecords(int id, [FromBody] AddRecordsToBatchRequest request)
    {
        if (request.RecordIds == null || request.RecordIds.Count == 0)
            return BadRequestResponse("At least one record ID must be provided.");

        try
        {
            var batch = await _transferBatchService.AddRecordsToBatchAsync(id, request.RecordIds);
            return OkResponse(batch);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Validates all records in the batch for metadata completeness.
    /// Records with incomplete metadata are flagged with validation errors.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <returns>The validation result.</returns>
    [HttpPost("batches/{id:int}/validate")]
    [ProducesResponseType(typeof(TransferBatchValidationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateBatch(int id)
    {
        try
        {
            var result = await _transferBatchService.ValidateBatchAsync(id);
            return OkResponse(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Finalizes the batch, removing invalid records and locking it from further changes.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <returns>The finalized batch.</returns>
    [HttpPost("batches/{id:int}/finalize")]
    [ProducesResponseType(typeof(TransferBatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> FinalizeBatch(int id)
    {
        try
        {
            var batch = await _transferBatchService.FinalizeBatchAsync(id);
            return OkResponse(batch);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Marks the batch as completed, updating all records to "Archived" status.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <param name="request">The completion request with archive reference number.</param>
    /// <returns>The completed batch.</returns>
    [HttpPost("batches/{id:int}/complete")]
    [ProducesResponseType(typeof(TransferBatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteBatch(int id, [FromBody] CompleteTransferBatchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ArchiveReferenceNumber))
            return BadRequestResponse("Archive reference number is required.");

        try
        {
            var batch = await _transferBatchService.CompleteBatchAsync(id, request.ArchiveReferenceNumber);
            return OkResponse(batch);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    /// <summary>
    /// Downloads the transfer manifest PDF for a finalized or completed batch.
    /// Manifest includes: batch number, transfer date, destination archive,
    /// list of records with metadata, and total record count.
    /// </summary>
    /// <param name="id">The batch ID.</param>
    /// <returns>PDF file content.</returns>
    [HttpGet("batches/{id:int}/manifest")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetManifest(int id)
    {
        try
        {
            var pdfBytes = await _transferBatchService.GenerateManifestAsync(id);
            return File(pdfBytes, "application/pdf", $"transfer-manifest-{id}.pdf");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
