using Rmrs.Application.Models.Bitrix;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Centralized client for all Bitrix REST API interactions.
/// All modules interact with Bitrix through this shared infrastructure service.
/// </summary>
public interface IBitrixApiClient
{
    // ==========================================
    // OAuth Operations
    // ==========================================

    /// <summary>
    /// Exchanges an authorization code for an OAuth token pair.
    /// </summary>
    /// <param name="code">The authorization code received from the Bitrix OAuth callback.</param>
    /// <returns>A token pair containing access and refresh tokens.</returns>
    Task<TokenPair> ExchangeAuthCodeAsync(string code);

    /// <summary>
    /// Refreshes an expired access token using the provided refresh token.
    /// </summary>
    /// <param name="refreshToken">The refresh token to use for obtaining a new access token.</param>
    /// <returns>A new token pair with updated access and refresh tokens.</returns>
    Task<TokenPair> RefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Retrieves the current user's profile from Bitrix.
    /// </summary>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>The authenticated user's Bitrix profile information.</returns>
    Task<BitrixUserProfile> GetUserProfileAsync(string accessToken);

    // ==========================================
    // Workgroup Operations
    // ==========================================

    /// <summary>
    /// Retrieves a workgroup by its ID from Bitrix.
    /// </summary>
    /// <param name="workgroupId">The Bitrix workgroup identifier.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>The workgroup information, or null if not found.</returns>
    Task<BitrixWorkgroup?> GetWorkgroupAsync(int workgroupId, string accessToken);

    /// <summary>
    /// Validates whether a workgroup exists on the Bitrix platform.
    /// </summary>
    /// <param name="workgroupId">The Bitrix workgroup identifier to validate.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>True if the workgroup exists, false otherwise.</returns>
    Task<bool> ValidateWorkgroupExistsAsync(int workgroupId, string accessToken);

    /// <summary>
    /// Fetches all workgroups from Bitrix using the configured webhook (no user token needed).
    /// Used for syncing departments.
    /// </summary>
    /// <returns>List of all Bitrix workgroups.</returns>
    Task<List<BitrixWorkgroup>> GetAllWorkgroupsAsync();

    // ==========================================
    // Drive / File Operations
    // ==========================================

    /// <summary>
    /// Creates a subfolder in the specified Bitrix drive folder.
    /// </summary>
    /// <param name="parentFolderId">The parent folder ID in Bitrix drive.</param>
    /// <param name="folderName">The name for the new subfolder.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>The ID of the newly created folder.</returns>
    Task<int> CreateFolderAsync(int parentFolderId, string folderName, string accessToken);

    /// <summary>
    /// Uploads a file to the specified folder in Bitrix drive.
    /// </summary>
    /// <param name="folderId">The target folder ID for the upload.</param>
    /// <param name="fileName">The name of the file being uploaded.</param>
    /// <param name="content">The file content stream.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>Information about the uploaded file including its Bitrix file ID.</returns>
    Task<BitrixFileInfo> UploadFileAsync(int folderId, string fileName, Stream content, string accessToken);

    /// <summary>
    /// Downloads a file from Bitrix drive.
    /// </summary>
    /// <param name="fileId">The Bitrix file identifier.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>A stream containing the file content.</returns>
    Task<Stream> DownloadFileAsync(int fileId, string accessToken);

    /// <summary>
    /// Deletes a file from Bitrix drive.
    /// </summary>
    /// <param name="fileId">The Bitrix file identifier.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    Task DeleteFileAsync(int fileId, string accessToken);

    /// <summary>
    /// Retrieves file information (metadata) from Bitrix drive.
    /// </summary>
    /// <param name="fileId">The Bitrix file identifier.</param>
    /// <param name="accessToken">A valid access token for the API call.</param>
    /// <returns>File information including name, size, content type, and download URL.</returns>
    Task<BitrixFileInfo> GetFileInfoAsync(int fileId, string accessToken);
}
