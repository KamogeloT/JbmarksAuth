namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing archive transfer batches.
/// Handles batch creation, record eligibility validation, metadata completeness checks,
/// finalization, and completion with archival status updates.
/// Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5.
/// </summary>
public interface ITransferBatchService
{
    /// <summary>
    /// Creates a new transfer batch in Draft status.
    /// </summary>
    /// <param name="request">The batch creation request containing destination archive info.</param>
    /// <returns>The created transfer batch.</returns>
    Task<TransferBatchDto> CreateBatchAsync(CreateTransferBatchRequest request);

    /// <summary>
    /// Adds eligible records to an existing transfer batch.
    /// Records must have completed retention and be marked for archival transfer.
    /// </summary>
    /// <param name="batchId">The ID of the batch to add records to.</param>
    /// <param name="recordIds">The IDs of records to add.</param>
    /// <returns>The updated batch with records added.</returns>
    Task<TransferBatchDto> AddRecordsToBatchAsync(int batchId, IEnumerable<int> recordIds);

    /// <summary>
    /// Validates all records in the batch for metadata completeness.
    /// Checks: classification code, registry number, title, date range, format type.
    /// Records with incomplete metadata are excluded and the archivist is notified.
    /// </summary>
    /// <param name="batchId">The ID of the batch to validate.</param>
    /// <returns>A validation result indicating valid/invalid records and their errors.</returns>
    Task<TransferBatchValidationResult> ValidateBatchAsync(int batchId);

    /// <summary>
    /// Finalizes the batch, locking it from further record changes.
    /// Only valid records remain in the batch after finalization.
    /// </summary>
    /// <param name="batchId">The ID of the batch to finalize.</param>
    /// <returns>The finalized batch.</returns>
    Task<TransferBatchDto> FinalizeBatchAsync(int batchId);

    /// <summary>
    /// Marks the batch as completed, updating all records to "Archived" status.
    /// Stores the archive reference number, transfer date, and receiving archive.
    /// </summary>
    /// <param name="batchId">The ID of the batch to complete.</param>
    /// <param name="archiveReferenceNumber">The reference number assigned by the receiving archive.</param>
    /// <returns>The completed batch.</returns>
    Task<TransferBatchDto> CompleteBatchAsync(int batchId, string archiveReferenceNumber);

    /// <summary>
    /// Gets a transfer batch by ID with its records.
    /// </summary>
    /// <param name="batchId">The batch ID.</param>
    /// <returns>The batch details or null if not found.</returns>
    Task<TransferBatchDto?> GetBatchAsync(int batchId);

    /// <summary>
    /// Generates a PDF manifest for the finalized batch.
    /// </summary>
    /// <param name="batchId">The batch ID.</param>
    /// <returns>The PDF manifest as a byte array.</returns>
    Task<byte[]> GenerateManifestAsync(int batchId);
}

// ─── Request/Response DTOs ─────────────────────────────────────────────────────

/// <summary>
/// Request to create a new transfer batch.
/// </summary>
public class CreateTransferBatchRequest
{
    /// <summary>
    /// The destination archive (e.g., "National Archives of South Africa").
    /// </summary>
    public string DestinationArchive { get; set; } = string.Empty;
}

/// <summary>
/// Request to add records to a transfer batch.
/// </summary>
public class AddRecordsToBatchRequest
{
    /// <summary>
    /// IDs of the records to add to the batch.
    /// </summary>
    public List<int> RecordIds { get; set; } = new();
}

/// <summary>
/// Request to complete a transfer batch.
/// </summary>
public class CompleteTransferBatchRequest
{
    /// <summary>
    /// The reference number assigned by the receiving archive.
    /// </summary>
    public string ArchiveReferenceNumber { get; set; } = string.Empty;
}

/// <summary>
/// DTO representing a transfer batch.
/// </summary>
public class TransferBatchDto
{
    public int Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public string DestinationArchive { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime? FinalizedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ArchiveReferenceNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TotalRecordCount { get; set; }
    public List<TransferBatchRecordDto> Records { get; set; } = new();
}

/// <summary>
/// DTO representing a record in a transfer batch.
/// </summary>
public class TransferBatchRecordDto
{
    public int Id { get; set; }
    public int RecordId { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string ClassificationCode { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty;
    public DateTime DateReceivedOrSent { get; set; }
    public string ValidationStatus { get; set; } = string.Empty;
    public string? ValidationErrors { get; set; }
}

/// <summary>
/// Result of validating a transfer batch.
/// </summary>
public class TransferBatchValidationResult
{
    public int BatchId { get; set; }
    public int TotalRecords { get; set; }
    public int ValidRecords { get; set; }
    public int InvalidRecords { get; set; }
    public List<TransferBatchRecordValidation> RecordValidations { get; set; } = new();
}

/// <summary>
/// Validation status of an individual record in a batch.
/// </summary>
public class TransferBatchRecordValidation
{
    public int RecordId { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}
