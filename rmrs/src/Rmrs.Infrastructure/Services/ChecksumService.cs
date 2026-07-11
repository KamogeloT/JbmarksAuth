using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Computes and verifies SHA-256 checksums for document integrity verification.
/// Downloads the current file from Bitrix, computes its checksum, and compares
/// against the stored checksum value to detect any unauthorized modifications.
/// </summary>
public class ChecksumService : IChecksumService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly ITokenService _tokenService;
    private readonly IUserContext _userContext;
    private readonly ILogger<ChecksumService> _logger;

    public ChecksumService(
        RmrsDbContext dbContext,
        IBitrixApiClient bitrixApiClient,
        ITokenService tokenService,
        IUserContext userContext,
        ILogger<ChecksumService> logger)
    {
        _dbContext = dbContext;
        _bitrixApiClient = bitrixApiClient;
        _tokenService = tokenService;
        _userContext = userContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public string ComputeSha256(Stream fileStream)
    {
        fileStream.Position = 0;
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(fileStream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <inheritdoc />
    public async Task<bool> VerifyAsync(int documentId)
    {
        // 1. Get the document with its latest version (which has the stored checksum)
        var document = await _dbContext.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (document == null)
            throw new NotFoundException("Document", documentId);

        // 2. Get the latest version's stored checksum
        var latestVersion = await _dbContext.DocumentVersions
            .AsNoTracking()
            .Where(v => v.DocumentId == documentId)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefaultAsync();

        if (latestVersion == null)
            throw new NotFoundException($"No versions found for document with ID '{documentId}'.");

        var storedChecksum = latestVersion.Sha256Checksum;

        // 3. Download the current file from Bitrix
        var accessToken = await _tokenService.GetValidAccessTokenAsync(_userContext.UserId);
        Stream fileStream;

        try
        {
            fileStream = await _bitrixApiClient.DownloadFileAsync(document.BitrixFileId, accessToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to download file from Bitrix for integrity verification. Document {DocumentId}, BitrixFileId {BitrixFileId}",
                documentId, document.BitrixFileId);
            throw new BitrixApiException(
                "Failed to download document from Bitrix for integrity verification.",
                ex.Message, ex);
        }

        // 4. Compute the current checksum
        string currentChecksum;
        using (fileStream)
        {
            currentChecksum = ComputeSha256(fileStream);
        }

        // 5. Compare checksums
        var isValid = string.Equals(storedChecksum, currentChecksum, StringComparison.OrdinalIgnoreCase);

        if (!isValid)
        {
            _logger.LogWarning(
                "Document integrity mismatch detected! Document {DocumentId}, Version {Version}. " +
                "Stored checksum: {StoredChecksum}, Current checksum: {CurrentChecksum}",
                documentId, latestVersion.VersionNumber, storedChecksum, currentChecksum);
        }
        else
        {
            _logger.LogInformation(
                "Document integrity verified successfully. Document {DocumentId}, Version {Version}, Checksum: {Checksum}",
                documentId, latestVersion.VersionNumber, storedChecksum);
        }

        return isValid;
    }
}
