using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Implements the archive transfer batch workflow:
/// Create → Add Records → Validate → Finalize → Complete.
/// Enforces eligibility (retention completed + archival transfer disposal action)
/// and metadata completeness checks.
/// Implements Requirements 8.1, 8.2, 8.4, 8.5.
/// </summary>
public class TransferBatchService : ITransferBatchService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IUserContext _userContext;
    private readonly ITransferManifestGenerator _manifestGenerator;
    private readonly ILogger<TransferBatchService> _logger;

    public TransferBatchService(
        RmrsDbContext dbContext,
        IUserContext userContext,
        ITransferManifestGenerator manifestGenerator,
        ILogger<TransferBatchService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        _manifestGenerator = manifestGenerator ?? throw new ArgumentNullException(nameof(manifestGenerator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<TransferBatchDto> CreateBatchAsync(CreateTransferBatchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DestinationArchive))
            throw new ArgumentException("Destination archive is required.", nameof(request));

        var batchNumber = await GenerateBatchNumberAsync();

        var batch = new TransferBatch
        {
            BatchNumber = batchNumber,
            DestinationArchive = request.DestinationArchive.Trim(),
            Status = "Draft",
            CreatedByUserId = _userContext.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.TransferBatches.Add(batch);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Archive transfer batch {BatchNumber} created by user {UserId} for destination {Destination}",
            batchNumber, _userContext.UserId, request.DestinationArchive);

        return await MapToDtoAsync(batch);
    }

    /// <inheritdoc />
    public async Task<TransferBatchDto> AddRecordsToBatchAsync(int batchId, IEnumerable<int> recordIds)
    {
        var batch = await _dbContext.TransferBatches
            .Include(b => b.TransferBatchRecords)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new KeyNotFoundException($"Transfer batch with ID {batchId} not found.");

        if (batch.Status != "Draft")
            throw new InvalidOperationException($"Cannot add records to a batch in '{batch.Status}' status. Batch must be in 'Draft' status.");

        var recordIdList = recordIds.ToList();
        if (recordIdList.Count == 0)
            throw new ArgumentException("At least one record ID must be provided.");

        // Load records with their file plan entry and retention rule for eligibility checks
        var records = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
                .ThenInclude(fp => fp.RetentionRule)
            .Include(r => r.Department)
            .Where(r => recordIdList.Contains(r.Id))
            .ToListAsync();

        var existingRecordIds = batch.TransferBatchRecords.Select(tbr => tbr.RecordId).ToHashSet();
        var addedCount = 0;

        foreach (var record in records)
        {
            // Skip if already in batch
            if (existingRecordIds.Contains(record.Id))
                continue;

            // Check eligibility: retention must be completed and disposal action must be 'Archive'
            var eligibilityErrors = CheckEligibility(record);
            if (eligibilityErrors.Count > 0)
            {
                _logger.LogWarning(
                    "Record {RecordId} ({RegistryNumber}) not eligible for transfer: {Errors}",
                    record.Id, record.RegistryNumber, string.Join("; ", eligibilityErrors));

                // Add with failed validation status so archivist can see why
                _dbContext.TransferBatchRecords.Add(new TransferBatchRecord
                {
                    TransferBatchId = batchId,
                    RecordId = record.Id,
                    ValidationStatus = "Ineligible",
                    ValidationErrors = string.Join("; ", eligibilityErrors)
                });
            }
            else
            {
                _dbContext.TransferBatchRecords.Add(new TransferBatchRecord
                {
                    TransferBatchId = batchId,
                    RecordId = record.Id,
                    ValidationStatus = "Pending"
                });
            }

            addedCount++;
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Added {Count} records to transfer batch {BatchId}",
            addedCount, batchId);

        return await GetBatchAsync(batchId)
            ?? throw new InvalidOperationException("Batch not found after adding records.");
    }

    /// <inheritdoc />
    public async Task<TransferBatchValidationResult> ValidateBatchAsync(int batchId)
    {
        var batch = await _dbContext.TransferBatches
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
                    .ThenInclude(r => r.FilePlanEntry)
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
                    .ThenInclude(r => r.Documents)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new KeyNotFoundException($"Transfer batch with ID {batchId} not found.");

        if (batch.Status != "Draft" && batch.Status != "Validated")
            throw new InvalidOperationException($"Cannot validate a batch in '{batch.Status}' status.");

        var result = new TransferBatchValidationResult
        {
            BatchId = batchId,
            TotalRecords = batch.TransferBatchRecords.Count
        };

        foreach (var tbr in batch.TransferBatchRecords)
        {
            var errors = ValidateMetadataCompleteness(tbr.Record);
            var isValid = errors.Count == 0;

            tbr.ValidationStatus = isValid ? "Valid" : "Invalid";
            tbr.ValidationErrors = isValid ? null : string.Join("; ", errors);

            result.RecordValidations.Add(new TransferBatchRecordValidation
            {
                RecordId = tbr.RecordId,
                RegistryNumber = tbr.Record.RegistryNumber,
                IsValid = isValid,
                Errors = errors
            });

            if (isValid)
                result.ValidRecords++;
            else
                result.InvalidRecords++;
        }

        // Update batch status to Validated
        batch.Status = "Validated";
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Transfer batch {BatchId} validated: {Valid} valid, {Invalid} invalid records",
            batchId, result.ValidRecords, result.InvalidRecords);

        return result;
    }

    /// <inheritdoc />
    public async Task<TransferBatchDto> FinalizeBatchAsync(int batchId)
    {
        var batch = await _dbContext.TransferBatches
            .Include(b => b.TransferBatchRecords)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new KeyNotFoundException($"Transfer batch with ID {batchId} not found.");

        if (batch.Status != "Validated")
            throw new InvalidOperationException($"Cannot finalize a batch in '{batch.Status}' status. Batch must be validated first.");

        // Remove invalid/ineligible records from the batch (Requirement 8.5)
        var invalidRecords = batch.TransferBatchRecords
            .Where(tbr => tbr.ValidationStatus != "Valid")
            .ToList();

        foreach (var invalid in invalidRecords)
        {
            _dbContext.TransferBatchRecords.Remove(invalid);
        }

        // Ensure there are still valid records remaining
        var validCount = batch.TransferBatchRecords.Count - invalidRecords.Count;
        if (validCount == 0)
            throw new InvalidOperationException("Cannot finalize batch — no valid records remain after removing invalid records.");

        batch.Status = "Finalized";
        batch.FinalizedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Transfer batch {BatchId} finalized with {ValidCount} records. {RemovedCount} invalid records removed.",
            batchId, validCount, invalidRecords.Count);

        return await GetBatchAsync(batchId)
            ?? throw new InvalidOperationException("Batch not found after finalization.");
    }

    /// <inheritdoc />
    public async Task<TransferBatchDto> CompleteBatchAsync(int batchId, string archiveReferenceNumber)
    {
        if (string.IsNullOrWhiteSpace(archiveReferenceNumber))
            throw new ArgumentException("Archive reference number is required.", nameof(archiveReferenceNumber));

        var batch = await _dbContext.TransferBatches
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new KeyNotFoundException($"Transfer batch with ID {batchId} not found.");

        if (batch.Status != "Finalized")
            throw new InvalidOperationException($"Cannot complete a batch in '{batch.Status}' status. Batch must be finalized first.");

        // Update each record to Archived status (Requirement 8.4)
        foreach (var tbr in batch.TransferBatchRecords)
        {
            tbr.Record.Status = "Archived";
            tbr.Record.UpdatedAt = DateTime.UtcNow;
        }

        batch.Status = "Completed";
        batch.CompletedAt = DateTime.UtcNow;
        batch.ArchiveReferenceNumber = archiveReferenceNumber.Trim();

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Transfer batch {BatchId} completed. {RecordCount} records archived with reference {ArchiveRef}",
            batchId, batch.TransferBatchRecords.Count, archiveReferenceNumber);

        return await GetBatchAsync(batchId)
            ?? throw new InvalidOperationException("Batch not found after completion.");
    }

    /// <inheritdoc />
    public async Task<TransferBatchDto?> GetBatchAsync(int batchId)
    {
        var batch = await _dbContext.TransferBatches
            .Include(b => b.CreatedByUser)
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
                    .ThenInclude(r => r.FilePlanEntry)
            .FirstOrDefaultAsync(b => b.Id == batchId);

        if (batch == null)
            return null;

        return await MapToDtoAsync(batch);
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateManifestAsync(int batchId)
    {
        var batch = await _dbContext.TransferBatches
            .Include(b => b.CreatedByUser)
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
                    .ThenInclude(r => r.FilePlanEntry)
            .Include(b => b.TransferBatchRecords)
                .ThenInclude(tbr => tbr.Record)
                    .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new KeyNotFoundException($"Transfer batch with ID {batchId} not found.");

        if (batch.Status != "Finalized" && batch.Status != "Completed")
            throw new InvalidOperationException($"Cannot generate manifest for a batch in '{batch.Status}' status. Batch must be finalized or completed.");

        return _manifestGenerator.GenerateManifest(batch);
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Checks eligibility for archive transfer (Requirement 8.1):
    /// - Record must have completed retention (RetentionExpiryDate <= now)
    /// - Record's disposal action must be 'Archive'
    /// </summary>
    private List<string> CheckEligibility(Record record)
    {
        var errors = new List<string>();

        // Must have retention expiry date set and it must be in the past
        if (record.RetentionExpiryDate == null)
        {
            errors.Add("Record does not have a retention expiry date set.");
        }
        else if (record.RetentionExpiryDate > DateTime.UtcNow)
        {
            errors.Add($"Record retention period has not completed. Expires: {record.RetentionExpiryDate:yyyy-MM-dd}.");
        }

        // Disposal action must be 'Archive' (not 'Destroy' or 'Review')
        if (record.FilePlanEntry?.RetentionRule?.DisposalAction != "Archive")
        {
            errors.Add("Record is not marked for archival transfer (disposal action is not 'Archive').");
        }

        // Record must be in Active status (not already archived or disposed)
        if (record.Status != "Active")
        {
            errors.Add($"Record is in '{record.Status}' status. Only 'Active' records can be transferred.");
        }

        return errors;
    }

    /// <summary>
    /// Validates metadata completeness for transfer (Requirement 8.2):
    /// classification code, registry number, title (subject), date range, format type.
    /// </summary>
    private List<string> ValidateMetadataCompleteness(Record record)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(record.RegistryNumber))
            errors.Add("Missing registry number.");

        if (string.IsNullOrWhiteSpace(record.Subject))
            errors.Add("Missing title/subject.");

        if (record.FilePlanEntry == null || string.IsNullOrWhiteSpace(record.FilePlanEntry.ClassificationCode))
            errors.Add("Missing classification code.");

        if (record.DateReceivedOrSent == default)
            errors.Add("Missing date received/sent.");

        if (string.IsNullOrWhiteSpace(record.RecordType))
            errors.Add("Missing format type (record type).");

        return errors;
    }

    /// <summary>
    /// Generates a unique batch number for the transfer batch.
    /// Pattern: TRF/{YYYY}/{SEQ:00000}
    /// </summary>
    private async Task<string> GenerateBatchNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var existingCount = await _dbContext.TransferBatches
            .CountAsync(b => b.CreatedAt.Year == year);

        var sequence = existingCount + 1;
        return $"TRF/{year}/{sequence:D5}";
    }

    /// <summary>
    /// Maps a TransferBatch entity to its DTO representation.
    /// </summary>
    private Task<TransferBatchDto> MapToDtoAsync(TransferBatch batch)
    {
        var dto = new TransferBatchDto
        {
            Id = batch.Id,
            BatchNumber = batch.BatchNumber,
            DestinationArchive = batch.DestinationArchive,
            Status = batch.Status,
            CreatedByUserId = batch.CreatedByUserId,
            CreatedByUserName = batch.CreatedByUser?.FullName ?? string.Empty,
            FinalizedAt = batch.FinalizedAt,
            CompletedAt = batch.CompletedAt,
            ArchiveReferenceNumber = batch.ArchiveReferenceNumber,
            CreatedAt = batch.CreatedAt,
            TotalRecordCount = batch.TransferBatchRecords?.Count ?? 0,
            Records = batch.TransferBatchRecords?.Select(tbr => new TransferBatchRecordDto
            {
                Id = tbr.Id,
                RecordId = tbr.RecordId,
                RegistryNumber = tbr.Record?.RegistryNumber ?? string.Empty,
                Subject = tbr.Record?.Subject ?? string.Empty,
                ClassificationCode = tbr.Record?.FilePlanEntry?.ClassificationCode ?? string.Empty,
                RecordType = tbr.Record?.RecordType ?? string.Empty,
                DateReceivedOrSent = tbr.Record?.DateReceivedOrSent ?? default,
                ValidationStatus = tbr.ValidationStatus,
                ValidationErrors = tbr.ValidationErrors
            }).ToList() ?? new List<TransferBatchRecordDto>()
        };

        return Task.FromResult(dto);
    }
}


