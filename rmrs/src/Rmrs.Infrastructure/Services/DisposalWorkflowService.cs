using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Implements the full disposal workflow:
/// candidate identification → batch creation (Records_Manager) → approval (Compliance_Officer) → execution → certificate generation.
/// Implements Requirements 7.1 - 7.7.
/// </summary>
public class DisposalWorkflowService : IDisposalWorkflowService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IBitrixApiClient _bitrixClient;
    private readonly ITokenService _tokenService;
    private readonly ILogger<DisposalWorkflowService> _logger;

    public DisposalWorkflowService(
        RmrsDbContext dbContext,
        IBitrixApiClient bitrixClient,
        ITokenService tokenService,
        ILogger<DisposalWorkflowService> logger)
    {
        _dbContext = dbContext;
        _bitrixClient = bitrixClient;
        _tokenService = tokenService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Record>> GetDisposalCandidatesAsync()
    {
        var now = DateTime.UtcNow.Date;

        // Get records past retention expiry that are still Active.
        // Requirement 7.7: Disposal certificates and audit logs are never disposal candidates.
        // Since certificates and audit logs are separate entities (not in the Records table),
        // we only need to filter Records whose status is Active and RetentionExpiryDate <= now.
        var candidates = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .Where(r => r.Status == "Active"
                     && r.RetentionExpiryDate != null
                     && r.RetentionExpiryDate.Value <= now)
            // Exclude records that are already in an active disposal batch
            .Where(r => !_dbContext.DisposalBatchRecords
                .Any(dbr => dbr.RecordId == r.Id
                         && (dbr.DisposalBatch.Status == "Initiated"
                          || dbr.DisposalBatch.Status == "Approved")))
            .OrderBy(r => r.RetentionExpiryDate)
            .ToListAsync();

        return candidates;
    }

    /// <inheritdoc />
    public async Task<DisposalBatch> InitiateDisposalAsync(InitiateDisposalRequest request, int initiatedByUserId)
    {
        if (request.RecordIds == null || request.RecordIds.Count == 0)
            throw new ArgumentException("At least one record must be specified for disposal.");

        if (string.IsNullOrWhiteSpace(request.DisposalAuthorityRef))
            throw new ArgumentException("A valid Disposal Authority reference is required.");

        // Validate all records exist and are eligible
        var records = await _dbContext.Records
            .Where(r => request.RecordIds.Contains(r.Id))
            .ToListAsync();

        if (records.Count != request.RecordIds.Count)
            throw new ArgumentException("One or more specified records do not exist.");

        var ineligible = records.Where(r => r.Status != "Active").ToList();
        if (ineligible.Any())
            throw new ArgumentException($"Records with IDs [{string.Join(", ", ineligible.Select(r => r.Id))}] are not in Active status.");

        // Generate batch number
        var batchNumber = await GenerateBatchNumberAsync();

        var batch = new DisposalBatch
        {
            BatchNumber = batchNumber,
            DisposalAuthorityRef = request.DisposalAuthorityRef,
            Status = "Initiated",
            InitiatedByUserId = initiatedByUserId,
            InitiatedAt = DateTime.UtcNow
        };

        _dbContext.DisposalBatches.Add(batch);
        await _dbContext.SaveChangesAsync();

        // Add records to the batch
        foreach (var recordId in request.RecordIds)
        {
            var batchRecord = new DisposalBatchRecord
            {
                DisposalBatchId = batch.Id,
                RecordId = recordId,
                DisposalStatus = "Pending"
            };
            _dbContext.DisposalBatchRecords.Add(batchRecord);
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Disposal batch {BatchNumber} initiated by user {UserId} with {RecordCount} records.",
            batchNumber, initiatedByUserId, request.RecordIds.Count);

        return batch;
    }

    /// <inheritdoc />
    public async Task<DisposalBatch> ApproveDisposalAsync(int batchId, int complianceOfficerId)
    {
        var batch = await _dbContext.DisposalBatches
            .FirstOrDefaultAsync(b => b.Id == batchId);

        if (batch == null)
            throw new ArgumentException($"Disposal batch with ID {batchId} not found.");

        if (batch.Status != "Initiated")
            throw new InvalidOperationException($"Disposal batch must be in 'Initiated' status to approve. Current status: {batch.Status}");

        // Requirement 7.3: Requires Compliance_Officer approval
        batch.Status = "Approved";
        batch.ApprovedByUserId = complianceOfficerId;
        batch.ApprovedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Disposal batch {BatchNumber} approved by Compliance Officer {UserId}.",
            batch.BatchNumber, complianceOfficerId);

        return batch;
    }

    /// <inheritdoc />
    public async Task ExecuteDisposalAsync(int batchId)
    {
        var batch = await _dbContext.DisposalBatches
            .Include(b => b.DisposalBatchRecords)
                .ThenInclude(br => br.Record)
                    .ThenInclude(r => r.Documents)
            .Include(b => b.ApprovedByUser)
            .FirstOrDefaultAsync(b => b.Id == batchId);

        if (batch == null)
            throw new ArgumentException($"Disposal batch with ID {batchId} not found.");

        if (batch.Status != "Approved")
            throw new InvalidOperationException($"Disposal batch must be in 'Approved' status to execute. Current status: {batch.Status}");

        // Requirement 7.3: Must have both Disposal_Authority reference and Compliance_Officer approval
        if (string.IsNullOrWhiteSpace(batch.DisposalAuthorityRef))
            throw new InvalidOperationException("Disposal batch is missing Disposal Authority reference.");

        if (batch.ApprovedByUserId == null)
            throw new InvalidOperationException("Disposal batch has not been approved by a Compliance Officer.");

        // Get a valid access token for Bitrix API calls (use the initiator's token)
        string accessToken;
        try
        {
            accessToken = await _tokenService.GetValidAccessTokenAsync(batch.InitiatedByUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to obtain access token for disposal execution. Batch: {BatchNumber}", batch.BatchNumber);
            throw new InvalidOperationException("Unable to authenticate with Bitrix for file deletion.");
        }

        // Process each record in the batch
        foreach (var batchRecord in batch.DisposalBatchRecords)
        {
            var record = batchRecord.Record;

            // Requirement 7.5: Delete files from Bitrix and remove file references
            var deletionSuccess = true;

            foreach (var document in record.Documents.ToList())
            {
                try
                {
                    await _bitrixClient.DeleteFileAsync(document.BitrixFileId, accessToken);

                    _logger.LogInformation(
                        "Deleted Bitrix file {FileId} for record {RecordId} in batch {BatchNumber}.",
                        document.BitrixFileId, record.Id, batch.BatchNumber);
                }
                catch (Exception ex)
                {
                    // Requirement 7.6: If Bitrix file deletion fails, mark as "disposal pending"
                    _logger.LogError(ex,
                        "Failed to delete Bitrix file {FileId} for record {RecordId}. Marking as disposal pending.",
                        document.BitrixFileId, record.Id);

                    deletionSuccess = false;
                    break;
                }
            }

            if (deletionSuccess)
            {
                // Remove file references from the database but retain metadata
                // Requirement 7.5: Retain metadata and disposal certificate
                foreach (var document in record.Documents.ToList())
                {
                    // Remove document versions
                    var versions = await _dbContext.DocumentVersions
                        .Where(v => v.DocumentId == document.Id)
                        .ToListAsync();
                    _dbContext.DocumentVersions.RemoveRange(versions);

                    // Remove document reference (file refs only, not metadata)
                    _dbContext.Documents.Remove(document);
                }

                record.Status = "Disposed";
                batchRecord.DisposalStatus = "Completed";
            }
            else
            {
                // Requirement 7.6: Mark record as "disposal pending" for manual intervention
                record.Status = "DisposalPending";
                batchRecord.DisposalStatus = "Pending";

                _logger.LogWarning(
                    "Record {RecordId} marked as 'disposal pending' due to Bitrix deletion failure.",
                    record.Id);
            }
        }

        batch.Status = "Executed";
        batch.ExecutedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        // Generate disposal certificate
        await GenerateDisposalCertificateAsync(batchId);

        _logger.LogInformation(
            "Disposal batch {BatchNumber} executed. Certificate generated.",
            batch.BatchNumber);
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateDisposalCertificateAsync(int batchId)
    {
        var batch = await _dbContext.DisposalBatches
            .Include(b => b.DisposalBatchRecords)
                .ThenInclude(br => br.Record)
                    .ThenInclude(r => r.Department)
            .Include(b => b.ApprovedByUser)
            .Include(b => b.InitiatedByUser)
            .FirstOrDefaultAsync(b => b.Id == batchId);

        if (batch == null)
            throw new ArgumentException($"Disposal batch with ID {batchId} not found.");

        // Use the DisposalCertificateGenerator to create the PDF
        var generator = new DisposalCertificateGenerator();
        var pdfData = generator.GenerateCertificate(batch);

        // Store the certificate
        var certificateNumber = $"CERT-{batch.BatchNumber}";

        var existingCert = await _dbContext.DisposalCertificates
            .FirstOrDefaultAsync(c => c.DisposalBatchId == batchId);

        if (existingCert != null)
        {
            existingCert.CertificateData = pdfData;
            existingCert.GeneratedAt = DateTime.UtcNow;
        }
        else
        {
            var certificate = new DisposalCertificate
            {
                DisposalBatchId = batchId,
                CertificateNumber = certificateNumber,
                GeneratedAt = DateTime.UtcNow,
                CertificateData = pdfData
            };
            _dbContext.DisposalCertificates.Add(certificate);
        }

        batch.CertificateGenerated = true;
        await _dbContext.SaveChangesAsync();

        return pdfData;
    }

    /// <inheritdoc />
    public async Task<DisposalCertificate?> GetCertificateAsync(int batchId)
    {
        return await _dbContext.DisposalCertificates
            .FirstOrDefaultAsync(c => c.DisposalBatchId == batchId);
    }

    /// <inheritdoc />
    public async Task<DisposalBatch?> GetBatchAsync(int batchId)
    {
        return await _dbContext.DisposalBatches
            .Include(b => b.DisposalBatchRecords)
                .ThenInclude(br => br.Record)
            .Include(b => b.InitiatedByUser)
            .Include(b => b.ApprovedByUser)
            .FirstOrDefaultAsync(b => b.Id == batchId);
    }

    /// <summary>
    /// Generates a unique batch number in format DISP-{YYYY}-{SEQ:00000}.
    /// </summary>
    private async Task<string> GenerateBatchNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"DISP-{year}-";

        var lastBatch = await _dbContext.DisposalBatches
            .Where(b => b.BatchNumber.StartsWith(prefix))
            .OrderByDescending(b => b.BatchNumber)
            .FirstOrDefaultAsync();

        int nextSeq = 1;
        if (lastBatch != null)
        {
            var seqPart = lastBatch.BatchNumber.Substring(prefix.Length);
            if (int.TryParse(seqPart, out var currentSeq))
            {
                nextSeq = currentSeq + 1;
            }
        }

        return $"{prefix}{nextSeq:D5}";
    }
}
