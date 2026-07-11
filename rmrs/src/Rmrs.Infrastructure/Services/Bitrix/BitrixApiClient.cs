using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Models.Bitrix;

namespace Rmrs.Infrastructure.Services.Bitrix;

/// <summary>
/// Centralized Bitrix REST API client implementing all Bitrix platform interactions.
/// All API calls go through the retry policy and include structured logging.
/// </summary>
public sealed class BitrixApiClient : IBitrixApiClient
{
    private readonly HttpClient _platformHttpClient;
    private readonly HttpClient _oauthHttpClient;
    private readonly BitrixRetryPolicy _retryPolicy;
    private readonly BitrixApiSettings _settings;
    private readonly ILogger<BitrixApiClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public BitrixApiClient(
        IHttpClientFactory httpClientFactory,
        BitrixRetryPolicy retryPolicy,
        IOptions<BitrixApiSettings> settings,
        ILogger<BitrixApiClient> logger)
    {
        _platformHttpClient = httpClientFactory.CreateClient("BitrixPlatform");
        _oauthHttpClient = httpClientFactory.CreateClient("BitrixOAuth");
        _retryPolicy = retryPolicy;
        _settings = settings.Value;
        _logger = logger;
    }

    // ==========================================
    // OAuth Operations
    // ==========================================

    /// <inheritdoc />
    public async Task<TokenPair> ExchangeAuthCodeAsync(string code)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        _logger.LogInformation("Exchanging authorization code for token pair");

        // Token exchange is NOT retried — 4xx auth errors should fail immediately
        var requestUri = $"{_settings.TokenPath}?" +
            $"grant_type=authorization_code" +
            $"&client_id={Uri.EscapeDataString(_settings.ClientId)}" +
            $"&client_secret={Uri.EscapeDataString(_settings.ClientSecret)}" +
            $"&code={Uri.EscapeDataString(code)}";

        var response = await _oauthHttpClient.GetAsync(requestUri);
        await EnsureSuccessOrThrowAsync(response, "ExchangeAuthCode");

        var tokenResponse = await response.Content.ReadFromJsonAsync<BitrixTokenResponse>(JsonOptions)
            ?? throw new BitrixApiException("Failed to deserialize token response");

        _logger.LogInformation("Successfully exchanged authorization code for token pair");

        return new TokenPair
        {
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    /// <inheritdoc />
    public async Task<TokenPair> RefreshTokenAsync(string refreshToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);

        _logger.LogInformation("Refreshing access token using refresh token");

        // Token refresh is NOT retried — auth errors should fail immediately
        var requestUri = $"{_settings.TokenPath}?" +
            $"grant_type=refresh_token" +
            $"&client_id={Uri.EscapeDataString(_settings.ClientId)}" +
            $"&client_secret={Uri.EscapeDataString(_settings.ClientSecret)}" +
            $"&refresh_token={Uri.EscapeDataString(refreshToken)}";

        var response = await _oauthHttpClient.GetAsync(requestUri);
        await EnsureSuccessOrThrowAsync(response, "RefreshToken");

        var tokenResponse = await response.Content.ReadFromJsonAsync<BitrixTokenResponse>(JsonOptions)
            ?? throw new BitrixApiException("Failed to deserialize refresh token response");

        _logger.LogInformation("Successfully refreshed access token");

        return new TokenPair
        {
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    /// <inheritdoc />
    public async Task<BitrixUserProfile> GetUserProfileAsync(string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Fetching user profile from Bitrix (user.current)");

        return await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            var requestUri = BuildRestApiUrl("user.current", accessToken);
            var response = await _platformHttpClient.GetAsync(requestUri);
            await EnsureSuccessOrThrowAsync(response, "GetUserProfile");

            var bitrixResponse = await response.Content.ReadFromJsonAsync<BitrixApiResponse<BitrixUserResult>>(JsonOptions)
                ?? throw new BitrixApiException("Failed to deserialize user profile response");

            if (bitrixResponse.Result == null)
                throw new BitrixApiException("Bitrix returned null user profile");

            _logger.LogInformation("Successfully fetched user profile for Bitrix user {UserId}", bitrixResponse.Result.Id);

            return new BitrixUserProfile
            {
                Id = bitrixResponse.Result.Id,
                FirstName = bitrixResponse.Result.Name ?? string.Empty,
                LastName = bitrixResponse.Result.LastName ?? string.Empty,
                Email = bitrixResponse.Result.Email ?? string.Empty,
                Department = bitrixResponse.Result.Department
            };
        }, "GetUserProfile");
    }

    // ==========================================
    // Workgroup Operations
    // ==========================================

    /// <inheritdoc />
    public async Task<BitrixWorkgroup?> GetWorkgroupAsync(int workgroupId, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Fetching workgroup {WorkgroupId} from Bitrix (sonet_group.get)", workgroupId);

        return await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            var requestUri = BuildRestApiUrl("sonet_group.get", accessToken, $"FILTER[ID]={workgroupId}");
            var response = await _platformHttpClient.GetAsync(requestUri);
            await EnsureSuccessOrThrowAsync(response, "GetWorkgroup");

            var bitrixResponse = await response.Content.ReadFromJsonAsync<BitrixApiResponse<BitrixWorkgroupResult[]>>(JsonOptions)
                ?? throw new BitrixApiException("Failed to deserialize workgroup response");

            if (bitrixResponse.Result == null || bitrixResponse.Result.Length == 0)
            {
                _logger.LogWarning("Workgroup {WorkgroupId} not found on Bitrix platform", workgroupId);
                return null;
            }

            var wg = bitrixResponse.Result[0];
            _logger.LogInformation("Successfully fetched workgroup {WorkgroupId}: {Name}", workgroupId, wg.Name);

            return new BitrixWorkgroup
            {
                Id = wg.Id,
                Name = wg.Name ?? string.Empty,
                Description = wg.Description,
                IsActive = wg.Active,
                OwnerId = wg.OwnerId
            };
        }, "GetWorkgroup");
    }

    /// <inheritdoc />
    public async Task<bool> ValidateWorkgroupExistsAsync(int workgroupId, string accessToken)
    {
        _logger.LogInformation("Validating workgroup {WorkgroupId} existence on Bitrix platform", workgroupId);

        var workgroup = await GetWorkgroupAsync(workgroupId, accessToken);
        var exists = workgroup != null;

        _logger.LogInformation("Workgroup {WorkgroupId} existence validation result: {Exists}", workgroupId, exists);
        return exists;
    }

    // ==========================================
    // Drive / File Operations
    // ==========================================

    /// <inheritdoc />
    public async Task<int> CreateFolderAsync(int parentFolderId, string folderName, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(folderName);
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Creating folder '{FolderName}' under parent folder {ParentFolderId} (disk.folder.addsubfolder)",
            folderName, parentFolderId);

        return await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            var requestUri = BuildRestApiUrl("disk.folder.addsubfolder", accessToken,
                $"id={parentFolderId}",
                $"data[NAME]={Uri.EscapeDataString(folderName)}");

            var response = await _platformHttpClient.GetAsync(requestUri);
            await EnsureSuccessOrThrowAsync(response, "CreateFolder");

            var bitrixResponse = await response.Content.ReadFromJsonAsync<BitrixApiResponse<BitrixFolderResult>>(JsonOptions)
                ?? throw new BitrixApiException("Failed to deserialize create folder response");

            if (bitrixResponse.Result == null)
                throw new BitrixApiException($"Failed to create folder '{folderName}' in Bitrix");

            _logger.LogInformation("Successfully created folder '{FolderName}' with ID {FolderId}",
                folderName, bitrixResponse.Result.Id);

            return bitrixResponse.Result.Id;
        }, "CreateFolder");
    }

    /// <inheritdoc />
    public async Task<BitrixFileInfo> UploadFileAsync(int folderId, string fileName, Stream content, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);
        ArgumentNullException.ThrowIfNull(content);

        _logger.LogInformation("Uploading file '{FileName}' to folder {FolderId} (disk.folder.uploadfile)",
            fileName, folderId);

        return await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            // Reset stream position for retries
            if (content.CanSeek)
                content.Position = 0;

            var requestUri = BuildRestApiUrl("disk.folder.uploadfile", accessToken, $"id={folderId}");

            using var multipartContent = new MultipartFormDataContent();
            using var streamContent = new StreamContent(content);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            multipartContent.Add(streamContent, "fileContent", fileName);

            var response = await _platformHttpClient.PostAsync(requestUri, multipartContent);
            await EnsureSuccessOrThrowAsync(response, "UploadFile");

            var bitrixResponse = await response.Content.ReadFromJsonAsync<BitrixApiResponse<BitrixFileResult>>(JsonOptions)
                ?? throw new BitrixApiException("Failed to deserialize upload file response");

            if (bitrixResponse.Result == null)
                throw new BitrixApiException($"Failed to upload file '{fileName}' to Bitrix");

            var result = bitrixResponse.Result;

            _logger.LogInformation("Successfully uploaded file '{FileName}' with Bitrix file ID {FileId}",
                fileName, result.Id);

            return new BitrixFileInfo
            {
                Id = result.Id,
                Name = result.Name ?? fileName,
                Size = result.Size,
                ContentType = result.ContentType ?? "application/octet-stream",
                DownloadUrl = result.DownloadUrl,
                FolderId = folderId,
                CreatedAt = result.CreatedDate ?? DateTime.UtcNow,
                UpdatedAt = result.UpdatedDate ?? DateTime.UtcNow
            };
        }, "UploadFile");
    }

    /// <inheritdoc />
    public async Task<Stream> DownloadFileAsync(int fileId, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Downloading file {FileId} from Bitrix (disk.file.get)", fileId);

        return await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            // First get the file info to obtain the download URL
            var fileInfo = await GetFileInfoInternalAsync(fileId, accessToken);

            if (string.IsNullOrWhiteSpace(fileInfo.DownloadUrl))
                throw new BitrixApiException($"No download URL available for file {fileId}");

            var response = await _platformHttpClient.GetAsync(fileInfo.DownloadUrl);
            await EnsureSuccessOrThrowAsync(response, "DownloadFile");

            _logger.LogInformation("Successfully initiated download for file {FileId}", fileId);

            return await response.Content.ReadAsStreamAsync();
        }, "DownloadFile");
    }

    /// <inheritdoc />
    public async Task DeleteFileAsync(int fileId, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Deleting file {FileId} from Bitrix (disk.file.delete)", fileId);

        await _retryPolicy.ExecuteWithRetryAsync(async () =>
        {
            var requestUri = BuildRestApiUrl("disk.file.delete", accessToken, $"id={fileId}");
            var response = await _platformHttpClient.GetAsync(requestUri);
            await EnsureSuccessOrThrowAsync(response, "DeleteFile");

            _logger.LogInformation("Successfully deleted file {FileId} from Bitrix", fileId);
        }, "DeleteFile");
    }

    /// <inheritdoc />
    public async Task<BitrixFileInfo> GetFileInfoAsync(int fileId, string accessToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(accessToken);

        _logger.LogInformation("Fetching file info for file {FileId} from Bitrix (disk.file.get)", fileId);

        return await _retryPolicy.ExecuteWithRetryAsync(
            () => GetFileInfoInternalAsync(fileId, accessToken), "GetFileInfo");
    }

    // ==========================================
    // Private Helpers
    // ==========================================

    private async Task<BitrixFileInfo> GetFileInfoInternalAsync(int fileId, string accessToken)
    {
        var requestUri = BuildRestApiUrl("disk.file.get", accessToken, $"id={fileId}");
        var response = await _platformHttpClient.GetAsync(requestUri);
        await EnsureSuccessOrThrowAsync(response, "GetFileInfo");

        var bitrixResponse = await response.Content.ReadFromJsonAsync<BitrixApiResponse<BitrixFileResult>>(JsonOptions)
            ?? throw new BitrixApiException("Failed to deserialize file info response");

        if (bitrixResponse.Result == null)
            throw new BitrixApiException($"File {fileId} not found on Bitrix platform");

        var result = bitrixResponse.Result;

        _logger.LogInformation("Successfully fetched info for file {FileId}: {FileName}", fileId, result.Name);

        return new BitrixFileInfo
        {
            Id = result.Id,
            Name = result.Name ?? string.Empty,
            Size = result.Size,
            ContentType = result.ContentType ?? "application/octet-stream",
            DownloadUrl = result.DownloadUrl,
            FolderId = result.ParentId,
            CreatedAt = result.CreatedDate ?? DateTime.UtcNow,
            UpdatedAt = result.UpdatedDate ?? DateTime.UtcNow
        };
    }

    /// <summary>
    /// Builds a REST API URL with the given method, access token, and optional parameters.
    /// </summary>
    private string BuildRestApiUrl(string method, string accessToken, params string[] parameters)
    {
        var url = $"{_settings.RestApiPath}/{method}?auth={Uri.EscapeDataString(accessToken)}";

        if (parameters.Length > 0)
        {
            url += "&" + string.Join("&", parameters);
        }

        return url;
    }

    /// <summary>
    /// Validates the HTTP response and throws an appropriate exception for error status codes.
    /// 4xx errors are thrown as non-retryable; 5xx errors as retryable.
    /// </summary>
    private static async Task EnsureSuccessOrThrowAsync(HttpResponseMessage response, string operation)
    {
        if (response.IsSuccessStatusCode)
            return;

        var responseBody = await response.Content.ReadAsStringAsync();
        string? errorCode = null;
        string? errorDescription = null;

        try
        {
            var errorResponse = JsonSerializer.Deserialize<BitrixErrorResponse>(responseBody, JsonOptions);
            errorCode = errorResponse?.Error;
            errorDescription = errorResponse?.ErrorDescription;
        }
        catch
        {
            // Ignore deserialization errors — use raw response body in message
        }

        var message = $"Bitrix API operation '{operation}' failed with HTTP {(int)response.StatusCode}: " +
            $"{errorDescription ?? errorCode ?? responseBody}";

        throw new BitrixApiException(message, response.StatusCode, errorCode, errorDescription);
    }

    // ==========================================
    // Internal response DTOs for Bitrix API deserialization
    // ==========================================

    private sealed class BitrixTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }

    private sealed class BitrixApiResponse<T>
    {
        [JsonPropertyName("result")]
        public T? Result { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }

        [JsonPropertyName("error_description")]
        public string? ErrorDescription { get; set; }
    }

    private sealed class BitrixErrorResponse
    {
        [JsonPropertyName("error")]
        public string? Error { get; set; }

        [JsonPropertyName("error_description")]
        public string? ErrorDescription { get; set; }
    }

    private sealed class BitrixUserResult
    {
        [JsonPropertyName("ID")]
        public int Id { get; set; }

        [JsonPropertyName("NAME")]
        public string? Name { get; set; }

        [JsonPropertyName("LAST_NAME")]
        public string? LastName { get; set; }

        [JsonPropertyName("EMAIL")]
        public string? Email { get; set; }

        [JsonPropertyName("UF_DEPARTMENT")]
        public string? Department { get; set; }
    }

    private sealed class BitrixWorkgroupResult
    {
        [JsonPropertyName("ID")]
        public int Id { get; set; }

        [JsonPropertyName("NAME")]
        public string? Name { get; set; }

        [JsonPropertyName("DESCRIPTION")]
        public string? Description { get; set; }

        [JsonPropertyName("ACTIVE")]
        public bool Active { get; set; }

        [JsonPropertyName("OWNER_ID")]
        public int OwnerId { get; set; }
    }

    private sealed class BitrixFolderResult
    {
        [JsonPropertyName("ID")]
        public int Id { get; set; }

        [JsonPropertyName("NAME")]
        public string? Name { get; set; }

        [JsonPropertyName("PARENT_ID")]
        public int ParentId { get; set; }
    }

    private sealed class BitrixFileResult
    {
        [JsonPropertyName("ID")]
        public int Id { get; set; }

        [JsonPropertyName("NAME")]
        public string? Name { get; set; }

        [JsonPropertyName("SIZE")]
        public long Size { get; set; }

        [JsonPropertyName("CONTENT_TYPE")]
        public string? ContentType { get; set; }

        [JsonPropertyName("DOWNLOAD_URL")]
        public string? DownloadUrl { get; set; }

        [JsonPropertyName("PARENT_ID")]
        public int ParentId { get; set; }

        [JsonPropertyName("CREATE_TIME")]
        public DateTime? CreatedDate { get; set; }

        [JsonPropertyName("UPDATE_TIME")]
        public DateTime? UpdatedDate { get; set; }
    }
}
