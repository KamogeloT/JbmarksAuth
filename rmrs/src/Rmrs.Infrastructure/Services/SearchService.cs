using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;
using Rmrs.Domain.Entities;
using Rmrs.Domain.Enums;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Implements full-text search across record metadata with access control filtering.
/// Uses SQL Server Full-Text Search on Records table (Subject, SenderOrRecipient,
/// ExternalReferenceNumber, OriginatingOrganization).
/// Applies role-based, department isolation, and classification level filters.
/// Implements Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6.
/// </summary>
public class SearchService : ISearchService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IUserContext _userContext;
    private readonly IDepartmentIsolationFilter _departmentFilter;
    private readonly IClassificationGuard _classificationGuard;
    private readonly ILogger<SearchService> _logger;

    /// <summary>
    /// Maximum number of results to return (Requirement 9.3: up to 1000 results).
    /// </summary>
    private const int MaxPageSize = 1000;

    public SearchService(
        RmrsDbContext dbContext,
        IUserContext userContext,
        IDepartmentIsolationFilter departmentFilter,
        IClassificationGuard classificationGuard,
        ILogger<SearchService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        _departmentFilter = departmentFilter ?? throw new ArgumentNullException(nameof(departmentFilter));
        _classificationGuard = classificationGuard ?? throw new ArgumentNullException(nameof(classificationGuard));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<SearchResultPage> SearchAsync(SearchQuery query)
    {
        // Clamp page size to maximum
        if (query.PageSize > MaxPageSize)
            query.PageSize = MaxPageSize;
        if (query.PageSize < 1)
            query.PageSize = 50;
        if (query.Page < 1)
            query.Page = 1;

        IQueryable<Record> baseQuery = _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .AsNoTracking();

        // ─── Apply Full-Text Search ──────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
        {
            var searchTerm = SanitizeFullTextSearchTerm(query.SearchTerm);

            // Use SQL Server FREETEXT for natural language search across indexed columns
            baseQuery = baseQuery.Where(r =>
                EF.Functions.FreeText(r.Subject, searchTerm) ||
                EF.Functions.FreeText(r.SenderOrRecipient!, searchTerm) ||
                EF.Functions.FreeText(r.ExternalReferenceNumber!, searchTerm) ||
                EF.Functions.FreeText(r.OriginatingOrganization!, searchTerm) ||
                r.RegistryNumber.Contains(query.SearchTerm) ||
                r.FilePlanEntry.ClassificationCode.Contains(query.SearchTerm));
        }

        // ─── Apply Access Filters (Requirement 9.2) ─────────────────────────────
        baseQuery = ApplyAccessFilters(baseQuery);

        // ─── Apply Advanced Filters (Requirement 9.4) ────────────────────────────
        baseQuery = ApplyAdvancedFilters(baseQuery, query);

        // ─── Execute Query with Pagination ────────────────────────────────────────
        var totalCount = await baseQuery.CountAsync();
        var skip = (query.Page - 1) * query.PageSize;

        var records = await baseQuery
            .OrderByDescending(r => r.DateReceivedOrSent)
            .ThenBy(r => r.RegistryNumber)
            .Skip(skip)
            .Take(query.PageSize)
            .Select(r => new SearchResultItem
            {
                Id = r.Id,
                RegistryNumber = r.RegistryNumber,
                Subject = r.Subject,
                RecordType = r.RecordType,
                DateReceivedOrSent = r.DateReceivedOrSent,
                ClassificationCode = r.FilePlanEntry.ClassificationCode,
                Status = r.Status,
                DepartmentName = r.Department.DepartmentName,
                SenderOrRecipient = r.SenderOrRecipient
            })
            .ToListAsync();

        return new SearchResultPage
        {
            Items = records,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / query.PageSize)
        };
    }

    /// <inheritdoc />
    public async Task<RecordDetailDto?> GetRecordDetailAsync(int recordId)
    {
        var record = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .Include(r => r.ResponsibleOfficer)
            .Include(r => r.Documents)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recordId);

        if (record == null)
            return null;

        // Verify department access
        if (!_departmentFilter.CanAccessDepartment(record.Department.DepartmentCode))
        {
            _logger.LogWarning(
                "User {UserId} attempted to access record {RecordId} in department {Dept} without permission",
                _userContext.UserId, recordId, record.Department.DepartmentCode);
            return null;
        }

        // Verify classification level access
        var canAccess = await _classificationGuard.CheckAccessAsync(recordId, record.ClassificationLevel, "ViewDetail");
        if (!canAccess)
        {
            return null;
        }

        // Map to DTO
        return new RecordDetailDto
        {
            Id = record.Id,
            RegistryNumber = record.RegistryNumber,
            RecordType = record.RecordType,
            Subject = record.Subject,
            SenderOrRecipient = record.SenderOrRecipient,
            DateReceivedOrSent = record.DateReceivedOrSent,
            ClassificationCode = record.FilePlanEntry.ClassificationCode,
            ClassificationTitle = record.FilePlanEntry.Title,
            ClassificationLevel = record.ClassificationLevel,
            ClassificationLevelName = ((ClassificationLevel)record.ClassificationLevel).ToString(),
            ResponsibleOfficerName = record.ResponsibleOfficer.FullName,
            DepartmentName = record.Department.DepartmentName,
            ExternalReferenceNumber = record.ExternalReferenceNumber,
            OriginatingOrganization = record.OriginatingOrganization,
            CorrespondenceDate = record.CorrespondenceDate,
            Status = record.Status,
            RetentionExpiryDate = record.RetentionExpiryDate,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt,
            Documents = record.Documents.Select(d => new RecordDocumentDto
            {
                Id = d.Id,
                FileName = d.FileName,
                FileSize = d.FileSize,
                MimeType = d.MimeType,
                CurrentVersion = d.CurrentVersion,
                CreatedAt = d.CreatedAt,
                DownloadUrl = $"/api/v1/documents/{d.Id}/download"
            }).ToList()
        };
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Applies role-based, department isolation, and classification level filters.
    /// - Department_User/Department_Supervisor: only their department's records
    /// - All users: only records at or below their classification level
    /// </summary>
    private IQueryable<Record> ApplyAccessFilters(IQueryable<Record> query)
    {
        // Department isolation filter (Requirement 10.2)
        var departmentCode = _departmentFilter.GetFilterDepartmentCode();
        if (departmentCode != null)
        {
            query = query.Where(r => r.Department.DepartmentCode == departmentCode);
        }

        // Classification level filter (Requirement 10.3)
        var maxLevel = _userContext.MaxClassificationLevel;
        query = query.Where(r => r.ClassificationLevel <= maxLevel);

        return query;
    }

    /// <summary>
    /// Applies advanced search filters: date range, record type, department, classification, status.
    /// </summary>
    private IQueryable<Record> ApplyAdvancedFilters(IQueryable<Record> query, SearchQuery searchQuery)
    {
        if (searchQuery.DateFrom.HasValue)
        {
            query = query.Where(r => r.DateReceivedOrSent >= searchQuery.DateFrom.Value);
        }

        if (searchQuery.DateTo.HasValue)
        {
            query = query.Where(r => r.DateReceivedOrSent <= searchQuery.DateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchQuery.RecordType))
        {
            query = query.Where(r => r.RecordType == searchQuery.RecordType);
        }

        if (!string.IsNullOrWhiteSpace(searchQuery.DepartmentCode))
        {
            // Additional department filter (user may want to narrow to a specific dept
            // from their accessible departments)
            query = query.Where(r => r.Department.DepartmentCode == searchQuery.DepartmentCode);
        }

        if (!string.IsNullOrWhiteSpace(searchQuery.ClassificationCode))
        {
            query = query.Where(r => r.FilePlanEntry.ClassificationCode == searchQuery.ClassificationCode);
        }

        if (!string.IsNullOrWhiteSpace(searchQuery.Status))
        {
            query = query.Where(r => r.Status == searchQuery.Status);
        }

        return query;
    }

    /// <summary>
    /// Sanitizes the search term for safe use in SQL Server Full-Text Search.
    /// Removes special characters that could break FREETEXT/CONTAINS queries.
    /// </summary>
    private static string SanitizeFullTextSearchTerm(string term)
    {
        // Remove characters that are problematic for full-text search
        var sanitized = term
            .Replace("\"", " ")
            .Replace("'", " ")
            .Replace("*", " ")
            .Replace("~", " ")
            .Replace("!", " ")
            .Replace("&", " ")
            .Replace("|", " ")
            .Replace("(", " ")
            .Replace(")", " ")
            .Trim();

        // Collapse multiple spaces
        while (sanitized.Contains("  "))
            sanitized = sanitized.Replace("  ", " ");

        return sanitized;
    }
}
