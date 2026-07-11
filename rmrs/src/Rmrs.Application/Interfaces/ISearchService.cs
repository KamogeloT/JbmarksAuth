namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for full-text search across records with access control filtering.
/// Uses SQL Server Full-Text Search for high-performance query across subject,
/// sender/recipient, registry number, and classification code.
/// Implements Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6.
/// </summary>
public interface ISearchService
{
    /// <summary>
    /// Executes a full-text search across record metadata with access filtering.
    /// Returns results within 3 seconds for up to 1000 results.
    /// </summary>
    /// <param name="query">The search query with optional filters.</param>
    /// <returns>The search results filtered by user access permissions.</returns>
    Task<SearchResultPage> SearchAsync(SearchQuery query);

    /// <summary>
    /// Gets the full detail of a single record including document links.
    /// Verifies user access permissions before returning the record.
    /// </summary>
    /// <param name="recordId">The ID of the record to retrieve.</param>
    /// <returns>The record detail or null if not found/not accessible.</returns>
    Task<RecordDetailDto?> GetRecordDetailAsync(int recordId);
}

// ─── Search Query Model ────────────────────────────────────────────────────────

/// <summary>
/// Search query parameters supporting full-text search and advanced filters.
/// </summary>
public class SearchQuery
{
    /// <summary>
    /// Full-text search term. Searches across subject, sender/recipient,
    /// registry number, classification code, and originating organization.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by start date (inclusive).
    /// </summary>
    public DateTime? DateFrom { get; set; }

    /// <summary>
    /// Filter by end date (inclusive).
    /// </summary>
    public DateTime? DateTo { get; set; }

    /// <summary>
    /// Filter by record type (Incoming, Outgoing, Internal).
    /// </summary>
    public string? RecordType { get; set; }

    /// <summary>
    /// Filter by department code.
    /// </summary>
    public string? DepartmentCode { get; set; }

    /// <summary>
    /// Filter by file plan classification code.
    /// </summary>
    public string? ClassificationCode { get; set; }

    /// <summary>
    /// Filter by record status (Active, Archived, Disposed, etc.).
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Page number (1-based). Default is 1.
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of results per page. Default is 50, max 1000.
    /// </summary>
    public int PageSize { get; set; } = 50;
}

// ─── Search Response Models ────────────────────────────────────────────────────

/// <summary>
/// Paginated search result set.
/// </summary>
public class SearchResultPage
{
    public List<SearchResultItem> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

/// <summary>
/// Individual search result item with required display fields.
/// Satisfies Requirement 9.5: registry number, subject, record type, date, classification code, status.
/// </summary>
public class SearchResultItem
{
    public int Id { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty;
    public DateTime DateReceivedOrSent { get; set; }
    public string ClassificationCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? SenderOrRecipient { get; set; }
}

/// <summary>
/// Full record detail including metadata and document links.
/// Satisfies Requirement 9.6: full metadata with link to associated document.
/// </summary>
public class RecordDetailDto
{
    public int Id { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? SenderOrRecipient { get; set; }
    public DateTime DateReceivedOrSent { get; set; }
    public string ClassificationCode { get; set; } = string.Empty;
    public string ClassificationTitle { get; set; } = string.Empty;
    public int ClassificationLevel { get; set; }
    public string ClassificationLevelName { get; set; } = string.Empty;
    public string ResponsibleOfficerName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? ExternalReferenceNumber { get; set; }
    public string? OriginatingOrganization { get; set; }
    public DateTime? CorrespondenceDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? RetentionExpiryDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<RecordDocumentDto> Documents { get; set; } = new();
}

/// <summary>
/// Document summary linked to a record for detail view.
/// </summary>
public class RecordDocumentDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; }  = string.Empty;
    public int CurrentVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>
    /// API URL to download this document.
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;
}
