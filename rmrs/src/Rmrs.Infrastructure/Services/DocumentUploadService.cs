using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Models.Bitrix;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Orchestrates document upload operations including:
/// - File size validation (max 100MB)
/// - SHA-256 checksum computation
/// - Folder structure creation in Bitrix workgroup drive
/// - File upload to Bitrix with retry logic
/// - Metadata persistence in SQL Server
/// 
/// On transient Bitrix failures, retries up to 3 times with exponential backoff (1s, 4s, 16s).
/// If all retries are exhausted, notifies the user and logs the failure.
/// </summary>
public class DocumentUploadService : IDocumentUploadService
{
    /// <summary>
    /// Maximum allowed file size: 100 MB.
    /// </summary>
    private const long MaxFileSizeBytes = 100L * 1024 * 1024; // 100 MB

    private readonly RmrsDbContext _dbContext;
    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly IBitrixFolderService _bitrixFolderService;
    private readonly ITokenService _tokenService;
    private readonly IUserContext _userContext;
    private readonly Bitrix.BitrixRetryPolicy _retryPolicy;
    private readonly ILogger<DocumentUploadService> _logger;

    public DocumentUploadService(
        RmrsDbContext dbContext,
        IBitrixApiClient bitrixApiClient,
        IBitrixFolderService bitrixFolderService,
        ITokenService tokenService,
        IUserContext userContext,
        Bitrix.BitrixRetryPolicy retryPolicy,
        ILogger<DocumentUploadService> logger)
    {
        _dbContext = dbContext;
        _bitrixApiClient = bitrixApiClient;
        _bitrixFolderService = bitrixFolderService;
        _tokenService = tokenService;
        _userContext = userContext;
        _retryPolicy = retryPolicy;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<DocumentVersion> UploadAsync(
        int recordId,
        Stream fileStream,
        string fileName,
        string mimeType,
        int userId)
    {
        // 1. Validate file size
        ValidateFileSize(fileStream);

        // 2. Retrieve the record with its file plan entry and department
        var record = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == recordId);

        if (record == null)
            throw new NotFoundException("Record", recordId);

        // 3. Compute SHA-256 checksum
        var checksum = ComputeSha256(fileStream);
        fileStream.Position = 0; // Reset stream after checksum computation

        // 4. Build the classification path from file plan hierarchy
        var classificationPath = await BuildClassificationPathAsync(record.FilePlanEntryId);

        // 5. Ensure folder structure exists in Bitrix workgroup drive
        int bitrixFolderId;
        try
        {
            bitrixFolderId = await _bitrixFolderService.EnsureFolderStructureAsync(
                record.Department.DepartmentCode,
                classificationPath);
        }
        catch (Bitrix.BitrixApiException ex)
        {
            _logger.LogError(ex,
                "Failed to ensure folder structure for record {RecordId} in department {DepartmentCode}. " +
                "Upload cannot proceed.",
                recordId, record.Department.DepartmentCode);
            throw new BitrixApiException(
                "Failed to create folder structure in Bitrix. Please try again later.",
                ex.Message, ex);
        }

        // 6. Upload file to Bitrix with retry logic
        var accessToken = await _tokenService.GetValidAccessTokenAsync(userId);
        BitrixFileInfo bitrixFile;

        try
        {
            bitrixFile = await _retryPolicy.ExecuteWithRetryAsync(
                async () => await _bitrixApiClient.UploadFileAsync(bitrixFolderId, fileName, fileStream, accessToken),
                $"UploadFile(Record:{recordId}, File:{fileName})");
        }
        catch (Bitrix.BitrixApiException ex)
        {
            // All retries exhausted — notify user and log failure
            _logger.LogError(ex,
                "Document upload to Bitrix failed after all retry attempts for record {RecordId}, file '{FileName}'. " +
                "User {UserId} has been notified.",
                recordId, fileName, userId);
            throw new BitrixApiException(
                $"Document upload failed after multiple attempts. Please try again later. File: '{fileName}'",
                "All retry attempts exhausted. The Bitrix platform may be temporarily unavailable.", ex);
        }

        // 7. Store document metadata in SQL Server
        var document = new Document
        {
            RecordId = recordId,
            FileName = fileName,
            FileSize = fileStream.Length,
            MimeType = mimeType,
            CurrentVersion = 1,
            BitrixFileId = bitrixFile.Id,
            BitrixFolderId = bitrixFolderId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync();

        // 8. Store document version with checksum
        var version = new DocumentVersion
        {
            DocumentId = document.Id,
            VersionNumber = 1,
            BitrixFileId = bitrixFile.Id,
            Sha256Checksum = checksum,
            FileSize = fileStream.Length,
            UploadedByUserId = userId,
            UploadedAt = DateTime.UtcNow
        };

        _dbContext.DocumentVersions.Add(version);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Document uploaded successfully: Record {RecordId}, Document {DocumentId}, " +
            "Version 1, BitrixFile {BitrixFileId}, Checksum {Checksum}",
            recordId, document.Id, bitrixFile.Id, checksum);

        return version;
    }

    /// <inheritdoc/>
    public async Task<DocumentVersion> UploadNewVersionAsync(
        int documentId,
        Stream fileStream,
        string fileName,
        string mimeType,
        int userId)
    {
        // 1. Validate file size
        ValidateFileSize(fileStream);

        // 2. Retrieve the existing document
        var document = await _dbContext.Documents
            .Include(d => d.Record)
                .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (document == null)
            throw new NotFoundException("Document", documentId);

        // 3. Compute SHA-256 checksum
        var checksum = ComputeSha256(fileStream);
        fileStream.Position = 0; // Reset stream after checksum computation

        // 4. Upload new version to Bitrix (same folder as original)
        var accessToken = await _tokenService.GetValidAccessTokenAsync(userId);
        BitrixFileInfo bitrixFile;

        try
        {
            bitrixFile = await _retryPolicy.ExecuteWithRetryAsync(
                async () => await _bitrixApiClient.UploadFileAsync(document.BitrixFolderId, fileName, fileStream, accessToken),
                $"UploadNewVersion(Document:{documentId}, File:{fileName})");
        }
        catch (Bitrix.BitrixApiException ex)
        {
            // All retries exhausted — notify user and log failure
            _logger.LogError(ex,
                "Document version upload to Bitrix failed after all retry attempts for document {DocumentId}, " +
                "file '{FileName}'. User {UserId} has been notified.",
                documentId, fileName, userId);
            throw new BitrixApiException(
                $"Document version upload failed after multiple attempts. Please try again later. File: '{fileName}'",
                "All retry attempts exhausted. The Bitrix platform may be temporarily unavailable.", ex);
        }

        // 5. Increment version number
        var newVersionNumber = document.CurrentVersion + 1;

        // 6. Update document metadata
        document.CurrentVersion = newVersionNumber;
        document.FileName = fileName;
        document.FileSize = fileStream.Length;
        document.MimeType = mimeType;
        document.BitrixFileId = bitrixFile.Id;

        _dbContext.Documents.Update(document);

        // 7. Create document version record
        var version = new DocumentVersion
        {
            DocumentId = documentId,
            VersionNumber = newVersionNumber,
            BitrixFileId = bitrixFile.Id,
            Sha256Checksum = checksum,
            FileSize = fileStream.Length,
            UploadedByUserId = userId,
            UploadedAt = DateTime.UtcNow
        };

        _dbContext.DocumentVersions.Add(version);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Document version uploaded successfully: Document {DocumentId}, Version {Version}, " +
            "BitrixFile {BitrixFileId}, Checksum {Checksum}",
            documentId, newVersionNumber, bitrixFile.Id, checksum);

        return version;
    }

    /// <inheritdoc/>
    public async Task<Stream> DownloadAsync(int documentId)
    {
        var document = await _dbContext.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (document == null)
            throw new NotFoundException("Document", documentId);

        var accessToken = await _tokenService.GetValidAccessTokenAsync(_userContext.UserId);

        try
        {
            var stream = await _retryPolicy.ExecuteWithRetryAsync(
                async () => await _bitrixApiClient.DownloadFileAsync(document.BitrixFileId, accessToken),
                $"DownloadFile(Document:{documentId}, BitrixFile:{document.BitrixFileId})");

            return stream;
        }
        catch (Bitrix.BitrixApiException ex)
        {
            _logger.LogError(ex,
                "Document download from Bitrix failed for document {DocumentId}, BitrixFile {BitrixFileId}",
                documentId, document.BitrixFileId);
            throw new BitrixApiException(
                "Failed to download document from Bitrix. Please try again later.",
                ex.Message, ex);
        }
    }

    /// <summary>
    /// Validates that the file stream does not exceed the maximum allowed size (100 MB).
    /// </summary>
    private static void ValidateFileSize(Stream fileStream)
    {
        if (fileStream.Length > MaxFileSizeBytes)
        {
            throw new ValidationException(
                $"File size exceeds the maximum allowed size of 100 MB. " +
                $"Actual size: {fileStream.Length / (1024.0 * 1024.0):F2} MB.",
                $"Maximum allowed: {MaxFileSizeBytes} bytes. Actual: {fileStream.Length} bytes.");
        }
    }

    /// <summary>
    /// Computes the SHA-256 checksum of the file stream.
    /// The stream position is advanced to the end after computation.
    /// </summary>
    private static string ComputeSha256(Stream fileStream)
    {
        fileStream.Position = 0;
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(fileStream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Builds the classification path by traversing the file plan hierarchy from the given entry up to the root.
    /// Returns a path string like "Level1Title/Level2Title/Level3Title".
    /// </summary>
    private async Task<string> BuildClassificationPathAsync(int filePlanEntryId)
    {
        var segments = new List<string>();
        int? currentId = filePlanEntryId;

        while (currentId.HasValue)
        {
            var entry = await _dbContext.FilePlanEntries
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == currentId.Value);

            if (entry == null)
                break;

            segments.Add(entry.Title);
            currentId = entry.ParentId;
        }

        // Reverse to get root-to-leaf order
        segments.Reverse();

        return string.Join("/", segments);
    }
}
