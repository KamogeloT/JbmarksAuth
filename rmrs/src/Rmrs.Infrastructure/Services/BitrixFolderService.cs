using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Creates and manages folder structures in Bitrix workgroup drives that mirror
/// the file plan hierarchy for each department. The department-to-workgroup mapping
/// is read from the database (fully configurable, not hardcoded).
/// </summary>
public class BitrixFolderService : IBitrixFolderService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly ITokenService _tokenService;
    private readonly IUserContext _userContext;
    private readonly Bitrix.BitrixRetryPolicy _retryPolicy;
    private readonly ILogger<BitrixFolderService> _logger;

    public BitrixFolderService(
        RmrsDbContext dbContext,
        IBitrixApiClient bitrixApiClient,
        ITokenService tokenService,
        IUserContext userContext,
        Bitrix.BitrixRetryPolicy retryPolicy,
        ILogger<BitrixFolderService> logger)
    {
        _dbContext = dbContext;
        _bitrixApiClient = bitrixApiClient;
        _tokenService = tokenService;
        _userContext = userContext;
        _retryPolicy = retryPolicy;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<int> EnsureFolderStructureAsync(string departmentCode, string classificationPath)
    {
        if (string.IsNullOrWhiteSpace(departmentCode))
            throw new ValidationException("Department code is required.");

        if (string.IsNullOrWhiteSpace(classificationPath))
            throw new ValidationException("Classification path is required.");

        // Look up the department's workgroup drive from the database
        var department = await _dbContext.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DepartmentCode == departmentCode && d.IsActive);

        if (department == null)
            throw new NotFoundException("Department", departmentCode);

        var driveId = department.BitrixDriveId;

        // Split the classification path into segments (e.g., "Finance/Accounts Payable/Invoices")
        var pathSegments = classificationPath
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (pathSegments.Length == 0)
            throw new ValidationException("Classification path must contain at least one folder segment.");

        _logger.LogInformation(
            "Ensuring folder structure for department {DepartmentCode} with path '{ClassificationPath}' ({SegmentCount} levels) on drive {DriveId}",
            departmentCode, classificationPath, pathSegments.Length, driveId);

        // Walk the path, creating folders as needed.
        // The root folder ID for a Bitrix drive is the drive ID itself.
        var currentFolderId = driveId;

        foreach (var segment in pathSegments)
        {
            currentFolderId = await GetOrCreateFolderAsync(currentFolderId, segment);
        }

        _logger.LogInformation(
            "Folder structure ensured for department {DepartmentCode}, leaf folder ID: {FolderId}",
            departmentCode, currentFolderId);

        return currentFolderId;
    }

    /// <inheritdoc/>
    public async Task<int> GetOrCreateFolderAsync(int parentFolderId, string folderName)
    {
        if (string.IsNullOrWhiteSpace(folderName))
            throw new ValidationException("Folder name is required.");

        var accessToken = await _tokenService.GetValidAccessTokenAsync(_userContext.UserId);

        try
        {
            // Attempt to create the folder. If it already exists, Bitrix may return
            // the existing folder or throw an error depending on the endpoint behavior.
            // We use the retry policy for transient failures.
            var folderId = await _retryPolicy.ExecuteWithRetryAsync(
                async () => await _bitrixApiClient.CreateFolderAsync(parentFolderId, folderName, accessToken),
                $"CreateFolder({parentFolderId}, {folderName})");

            _logger.LogDebug(
                "Folder '{FolderName}' ensured in parent {ParentFolderId}, resulting folder ID: {FolderId}",
                folderName, parentFolderId, folderId);

            return folderId;
        }
        catch (Bitrix.BitrixApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            // Folder already exists — this is expected behavior.
            // The Bitrix API should return the existing folder ID in this case.
            _logger.LogDebug(
                "Folder '{FolderName}' already exists in parent {ParentFolderId}",
                folderName, parentFolderId);
            throw;
        }
    }
}
