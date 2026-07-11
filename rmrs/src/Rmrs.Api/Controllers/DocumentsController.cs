using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Manages electronic document upload, download, and versioning.
/// Documents are stored in Bitrix workgroup drives with metadata and checksums in SQL Server.
/// </summary>
[Authorize(Policy = PolicyNames.CanUploadDocuments)]
public class DocumentsController : RmrsControllerBase
{
    private readonly IDocumentUploadService _documentUploadService;
    private readonly IChecksumService _checksumService;
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(
        IUserContext userContext,
        IDocumentUploadService documentUploadService,
        IChecksumService checksumService,
        RmrsDbContext dbContext,
        ILogger<DocumentsController> logger)
        : base(userContext)
    {
        _documentUploadService = documentUploadService;
        _checksumService = checksumService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Uploads a new document for the specified record.
    /// The file is stored in the department's Bitrix workgroup drive in a folder structure
    /// mirroring the file plan hierarchy. SHA-256 checksum is computed and stored.
    /// Maximum file size: 100 MB.
    /// </summary>
    /// <param name="recordId">The record to attach the document to.</param>
    /// <param name="file">The file to upload (multipart/form-data).</param>
    [HttpPost("/api/v1/records/{recordId:int}/documents")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [RequestSizeLimit(104_857_600)] // 100 MB
    public async Task<IActionResult> Upload(int recordId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequestResponse("A file is required for upload.");

        try
        {
            using var stream = file.OpenReadStream();

            var version = await _documentUploadService.UploadAsync(
                recordId,
                stream,
                file.FileName,
                file.ContentType ?? "application/octet-stream",
                CurrentUser.UserId);

            var response = new DocumentVersionResponse
            {
                DocumentId = version.DocumentId,
                VersionNumber = version.VersionNumber,
                BitrixFileId = version.BitrixFileId,
                Sha256Checksum = version.Sha256Checksum,
                FileSize = version.FileSize,
                UploadedByUserId = version.UploadedByUserId,
                UploadedAt = version.UploadedAt
            };

            return CreatedResponse(
                nameof(Download),
                new { id = version.DocumentId },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during document upload for record {RecordId}", recordId);
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
    /// Downloads a document from Bitrix by its document ID.
    /// Returns the file content with appropriate MIME type and content disposition.
    /// </summary>
    /// <param name="id">The document ID.</param>
    [HttpGet("{id:int}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> Download(int id)
    {
        try
        {
            // Get document metadata for filename and MIME type
            var document = await GetDocumentMetadataAsync(id);
            if (document == null)
                return NotFoundResponse($"Document with ID '{id}' was not found.");

            var stream = await _documentUploadService.DownloadAsync(id);

            return File(stream, document.MimeType, document.FileName);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during document download for document {DocumentId}", id);
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
    /// Uploads a new version of an existing document.
    /// Creates version N+1 with a new SHA-256 checksum.
    /// Maximum file size: 100 MB.
    /// </summary>
    /// <param name="id">The existing document's ID.</param>
    /// <param name="file">The new version file (multipart/form-data).</param>
    [HttpPost("{id:int}/versions")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [RequestSizeLimit(104_857_600)] // 100 MB
    public async Task<IActionResult> UploadNewVersion(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequestResponse("A file is required for upload.");

        try
        {
            using var stream = file.OpenReadStream();

            var version = await _documentUploadService.UploadNewVersionAsync(
                id,
                stream,
                file.FileName,
                file.ContentType ?? "application/octet-stream",
                CurrentUser.UserId);

            var response = new DocumentVersionResponse
            {
                DocumentId = version.DocumentId,
                VersionNumber = version.VersionNumber,
                BitrixFileId = version.BitrixFileId,
                Sha256Checksum = version.Sha256Checksum,
                FileSize = version.FileSize,
                UploadedByUserId = version.UploadedByUserId,
                UploadedAt = version.UploadedAt
            };

            return CreatedResponse(
                nameof(Download),
                new { id = version.DocumentId },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during version upload for document {DocumentId}", id);
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
    /// Verifies the integrity of a document by comparing the stored SHA-256 checksum
    /// against the current file content in Bitrix.
    /// Alerts if a mismatch is detected, indicating potential unauthorized modification.
    /// </summary>
    /// <param name="id">The document ID to verify.</param>
    [HttpPost("{id:int}/verify")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> VerifyIntegrity(int id)
    {
        try
        {
            var isValid = await _checksumService.VerifyAsync(id);

            var response = new DocumentVerificationResponse
            {
                DocumentId = id,
                IsIntegrityValid = isValid,
                VerifiedAt = DateTime.UtcNow,
                VerifiedByUserId = CurrentUser.UserId,
                Message = isValid
                    ? "Document integrity verified successfully. Checksum matches."
                    : "INTEGRITY ALERT: Document checksum mismatch detected. The file may have been modified outside of RMRS."
            };

            return OkResponse(response);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (BitrixApiException ex)
        {
            _logger.LogError(ex, "Bitrix API error during integrity verification for document {DocumentId}", id);
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
    /// Lists all versions of a document, ordered by version number descending.
    /// </summary>
    /// <param name="id">The document ID.</param>
    [HttpGet("{id:int}/versions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVersions(int id)
    {
        var documentExists = await _dbContext.Documents.AnyAsync(d => d.Id == id);
        if (!documentExists)
            return NotFoundResponse($"Document with ID '{id}' was not found.");

        var versions = await _dbContext.DocumentVersions
            .Where(v => v.DocumentId == id)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionResponse
            {
                DocumentId = v.DocumentId,
                VersionNumber = v.VersionNumber,
                BitrixFileId = v.BitrixFileId,
                Sha256Checksum = v.Sha256Checksum,
                FileSize = v.FileSize,
                UploadedByUserId = v.UploadedByUserId,
                UploadedAt = v.UploadedAt
            })
            .ToListAsync();

        return OkResponse(versions);
    }

    /// <summary>
    /// Lists all documents associated with a specific record.
    /// </summary>
    /// <param name="recordId">The record ID.</param>
    [HttpGet("/api/v1/records/{recordId:int}/documents")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDocumentsByRecord(int recordId)
    {
        var recordExists = await _dbContext.Records.AnyAsync(r => r.Id == recordId);
        if (!recordExists)
            return NotFoundResponse($"Record with ID '{recordId}' was not found.");

        var documents = await _dbContext.Documents
            .Where(d => d.RecordId == recordId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DocumentListResponse
            {
                Id = d.Id,
                RecordId = d.RecordId,
                FileName = d.FileName,
                FileSize = d.FileSize,
                MimeType = d.MimeType,
                CurrentVersion = d.CurrentVersion,
                BitrixFileId = d.BitrixFileId,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        return OkResponse(documents);
    }

    /// <summary>
    /// Retrieves document metadata (filename, MIME type) from the database.
    /// </summary>
    private async Task<DocumentMetadata?> GetDocumentMetadataAsync(int documentId)
    {
        var doc = await _dbContext.Documents
            .Where(d => d.Id == documentId)
            .Select(d => new DocumentMetadata
            {
                Id = d.Id,
                FileName = d.FileName,
                MimeType = d.MimeType,
                FileSize = d.FileSize
            })
            .FirstOrDefaultAsync();

        return doc;
    }
}

// ────────────────────────────────────────────────────────────────────────
// Request/Response DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Response model for document version operations.
/// </summary>
public class DocumentVersionResponse
{
    /// <summary>
    /// The parent document ID.
    /// </summary>
    public int DocumentId { get; set; }

    /// <summary>
    /// The version number (starts at 1, increments with each upload).
    /// </summary>
    public int VersionNumber { get; set; }

    /// <summary>
    /// The Bitrix file ID for this version.
    /// </summary>
    public int BitrixFileId { get; set; }

    /// <summary>
    /// SHA-256 checksum computed at upload time for integrity verification.
    /// </summary>
    public string Sha256Checksum { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// The user ID who uploaded this version.
    /// </summary>
    public int UploadedByUserId { get; set; }

    /// <summary>
    /// Timestamp when this version was uploaded.
    /// </summary>
    public DateTime UploadedAt { get; set; }
}

/// <summary>
/// Internal model for document metadata retrieval.
/// </summary>
internal class DocumentMetadata
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
}

/// <summary>
/// Response model for document integrity verification.
/// </summary>
public class DocumentVerificationResponse
{
    /// <summary>
    /// The document ID that was verified.
    /// </summary>
    public int DocumentId { get; set; }

    /// <summary>
    /// Whether the integrity check passed (stored checksum matches current file).
    /// </summary>
    public bool IsIntegrityValid { get; set; }

    /// <summary>
    /// When the verification was performed.
    /// </summary>
    public DateTime VerifiedAt { get; set; }

    /// <summary>
    /// The user who initiated the verification.
    /// </summary>
    public int VerifiedByUserId { get; set; }

    /// <summary>
    /// Human-readable message about the verification result.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Response model for listing documents associated with a record.
/// </summary>
public class DocumentListResponse
{
    /// <summary>
    /// The document ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// The associated record ID.
    /// </summary>
    public int RecordId { get; set; }

    /// <summary>
    /// The current file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// The MIME type of the file.
    /// </summary>
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// The current version number.
    /// </summary>
    public int CurrentVersion { get; set; }

    /// <summary>
    /// The Bitrix file ID for the latest version.
    /// </summary>
    public int BitrixFileId { get; set; }

    /// <summary>
    /// When the document was first created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
