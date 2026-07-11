using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;

namespace Rmrs.Api.Controllers;

/// <summary>
/// API controller for full-text search and record retrieval.
/// Provides search across record metadata with access control filtering.
/// All authenticated users can search; results are filtered by their access permissions.
/// Implements Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6.
/// </summary>
[Authorize]
[Route("api/v1/search")]
public class SearchController : RmrsControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(
        IUserContext userContext,
        ISearchService searchService)
        : base(userContext)
    {
        _searchService = searchService ?? throw new ArgumentNullException(nameof(searchService));
    }

    /// <summary>
    /// Executes a full-text search across record metadata fields.
    /// Searches across subject, sender/recipient, registry number, classification code,
    /// and originating organization.
    /// Results are filtered by the current user's role, department, and classification level.
    /// Supports advanced filters: date range, record type, department, classification, status.
    /// Returns results within 3 seconds for up to 1000 results.
    /// </summary>
    /// <param name="query">The search query with optional filters.</param>
    /// <returns>Paginated search results.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(SearchResultPage), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromBody] SearchQuery query)
    {
        // Validate that at least one search criterion is provided
        if (string.IsNullOrWhiteSpace(query.SearchTerm) &&
            !query.DateFrom.HasValue &&
            !query.DateTo.HasValue &&
            string.IsNullOrWhiteSpace(query.RecordType) &&
            string.IsNullOrWhiteSpace(query.DepartmentCode) &&
            string.IsNullOrWhiteSpace(query.ClassificationCode) &&
            string.IsNullOrWhiteSpace(query.Status))
        {
            return BadRequestResponse(
                "At least one search criterion must be provided.",
                "Provide a search term or at least one filter (date range, record type, department, classification, or status).");
        }

        var results = await _searchService.SearchAsync(query);
        return OkResponse(results);
    }

    /// <summary>
    /// Gets the full detail of a specific record including associated documents.
    /// Verifies user access permissions (department + classification level) before returning.
    /// </summary>
    /// <param name="recordId">The ID of the record to retrieve.</param>
    /// <returns>Full record detail with document links.</returns>
    [HttpGet("records/{recordId:int}")]
    [ProducesResponseType(typeof(RecordDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Application.Models.ApiError), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetRecordDetail(int recordId)
    {
        var detail = await _searchService.GetRecordDetailAsync(recordId);

        if (detail == null)
        {
            // Could be not found OR not accessible — return 404 to avoid leaking existence
            return NotFoundResponse("Record not found or you do not have permission to view it.");
        }

        return OkResponse(detail);
    }
}
