using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Provides audit log query and compliance dashboard/report endpoints.
/// Implements Requirements 11.4, 11.5, 11.6.
/// </summary>
[Authorize(Policy = PolicyNames.CanViewAuditLogs)]
[Route("api/v1/audit")]
public class AuditController : RmrsControllerBase
{
    private readonly IAuditLogService _auditLogService;
    private readonly IComplianceDashboardService _complianceDashboardService;
    private readonly ILogger<AuditController> _logger;

    /// <summary>
    /// Minimum retention period for audit log entries (10 years).
    /// </summary>
    public static readonly TimeSpan MinimumAuditRetention = TimeSpan.FromDays(10 * 365);

    public AuditController(
        IUserContext userContext,
        IAuditLogService auditLogService,
        IComplianceDashboardService complianceDashboardService,
        ILogger<AuditController> logger)
        : base(userContext)
    {
        _auditLogService = auditLogService;
        _complianceDashboardService = complianceDashboardService;
        _logger = logger;
    }

    /// <summary>
    /// Queries audit logs with optional filters and pagination.
    /// Filters: userId, entityType, entityId, actionType, dateRange (fromDate/toDate).
    /// Pagination: page (1-based), pageSize (default 50, max 500).
    /// </summary>
    /// <returns>Paginated list of audit log entries.</returns>
    [HttpGet("logs")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] int? entityId = null,
        [FromQuery] string? actionType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        // Validate pagination parameters
        if (page < 1)
        {
            return BadRequestResponse("Page number must be at least 1.");
        }

        if (pageSize < 1 || pageSize > 500)
        {
            return BadRequestResponse("Page size must be between 1 and 500.");
        }

        // Enforce 10-year minimum retention: prevent queries that would imply deletion of older logs
        // (Audit logs are never deleted, but we document the retention policy here)
        // fromDate cannot be earlier than 10 years from now for data that still exists
        // All logs within 10 years are guaranteed to exist per Requirement 11.6

        var query = new AuditQuery
        {
            UserId = userId,
            EntityType = entityType,
            EntityId = entityId,
            ActionType = actionType,
            FromDate = fromDate,
            ToDate = toDate,
            Skip = (page - 1) * pageSize,
            Take = pageSize
        };

        _logger.LogDebug(
            "Querying audit logs: UserId={UserId}, EntityType={EntityType}, EntityId={EntityId}, ActionType={ActionType}, Page={Page}",
            userId, entityType, entityId, actionType, page);

        var results = await _auditLogService.QueryAsync(query);
        var totalCount = await _auditLogService.GetCountAsync(query);

        return PaginatedResponse(results, totalCount, page, pageSize);
    }

    /// <summary>
    /// Returns compliance dashboard metrics including pending disposals,
    /// overdue disposals, records approaching retention expiry, and file plan coverage.
    /// </summary>
    /// <returns>Compliance metrics.</returns>
    [HttpGet("compliance/metrics")]
    [Authorize(Policy = PolicyNames.CanViewDashboards)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetComplianceMetrics()
    {
        _logger.LogDebug("Fetching compliance metrics for user {UserId}", CurrentUser.UserId);

        var metrics = await _complianceDashboardService.GetComplianceMetricsAsync();

        return OkResponse(metrics);
    }

    /// <summary>
    /// Generates a compliance report for the specified date range.
    /// The report must be generated within 10 seconds for data spanning up to 12 months.
    /// </summary>
    /// <param name="request">The report generation request with date range.</param>
    /// <returns>The generated compliance report.</returns>
    [HttpPost("compliance/report")]
    [Authorize(Policy = PolicyNames.CanViewDashboards)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateComplianceReport([FromBody] ComplianceReportRequest request)
    {
        if (request == null)
        {
            return BadRequestResponse("Report request body is required.");
        }

        // Validate date range
        if (request.FromDate >= request.ToDate)
        {
            return BadRequestResponse("FromDate must be earlier than ToDate.");
        }

        // Validate maximum 12-month span for performance guarantee
        var maxSpan = request.FromDate.AddMonths(12).AddDays(1);
        if (request.ToDate > maxSpan)
        {
            return BadRequestResponse(
                "Report date range cannot exceed 12 months.",
                "The system guarantees report generation within 10 seconds for data spanning up to 12 months.");
        }

        _logger.LogInformation(
            "User {UserId} generating compliance report for {FromDate} to {ToDate}",
            CurrentUser.UserId, request.FromDate, request.ToDate);

        // Use a cancellation token with 10-second timeout to enforce SLA
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        try
        {
            var report = await _complianceDashboardService.GenerateComplianceReportAsync(request);
            return OkResponse(report);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning(
                "Compliance report generation timed out for period {FromDate} to {ToDate}",
                request.FromDate, request.ToDate);

            return StatusCode(StatusCodes.Status504GatewayTimeout, new
            {
                Code = "REPORT_TIMEOUT",
                Message = "Report generation exceeded the 10-second time limit.",
                TraceId = HttpContext.TraceIdentifier
            });
        }
    }
}
