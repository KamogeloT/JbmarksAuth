using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Controller for report generation (PDF/Excel export) and role-based dashboards.
/// Implements Requirements 12.1, 12.2, 12.3, 12.4, 12.5.
/// </summary>
[Authorize]
public class ReportsController : RmrsControllerBase
{
    private readonly IReportGeneratorService _reportGeneratorService;

    public ReportsController(
        IUserContext userContext,
        IReportGeneratorService reportGeneratorService)
        : base(userContext)
    {
        _reportGeneratorService = reportGeneratorService;
    }

    /// <summary>
    /// Gets the list of available report types.
    /// </summary>
    /// <returns>A collection of available report type descriptors.</returns>
    [HttpGet("/api/v1/reports/types")]
    [Authorize(Policy = PolicyNames.CanViewDashboards)]
    [ProducesResponseType(typeof(IEnumerable<ReportTypeDescriptor>), StatusCodes.Status200OK)]
    public IActionResult GetReportTypes()
    {
        var types = _reportGeneratorService.GetAvailableReportTypes();
        return OkResponse(types);
    }

    /// <summary>
    /// Generates a report in the specified format (PDF or Excel).
    /// Access control is applied: users only see data from departments and classification levels
    /// they are authorized to access (Requirement 12.5).
    /// </summary>
    /// <param name="request">The report generation request.</param>
    /// <returns>The generated report file.</returns>
    [HttpPost("/api/v1/reports/generate")]
    [Authorize(Policy = PolicyNames.CanViewDashboards)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateReport([FromBody] GenerateReportRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (!Enum.TryParse<ReportType>(request.ReportType, ignoreCase: true, out var reportType))
            return BadRequestResponse($"Invalid report type: '{request.ReportType}'.",
                $"Valid types: {string.Join(", ", Enum.GetNames<ReportType>())}");

        var format = request.Format?.ToLowerInvariant() ?? "pdf";
        if (format != "pdf" && format != "excel" && format != "csv")
            return BadRequestResponse("Invalid format. Supported formats: 'pdf', 'excel', 'csv'.");

        var parameters = new ReportParameters
        {
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            DepartmentCode = request.DepartmentCode,
            ClassificationLevel = request.ClassificationLevel
        };

        var reportBytes = await _reportGeneratorService.GenerateReportAsync(
            reportType, parameters, format, CurrentUser);

        var contentType = format == "pdf" ? "application/pdf" : "text/csv";
        var extension = format == "pdf" ? "pdf" : "csv";
        var fileName = $"RMRS_Report_{request.ReportType}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{extension}";

        return File(reportBytes, contentType, fileName);
    }

    /// <summary>
    /// Gets role-based dashboard data.
    /// Records_Manager: daily registration counts, overdue loans, upcoming disposals, transfer batch status.
    /// Executive_Viewer: aggregate statistics across all departments.
    /// Compliance: pending/overdue disposals, approaching retention expiry, file plan coverage.
    /// </summary>
    /// <param name="role">The role for which to retrieve dashboard data.</param>
    /// <returns>Dashboard data appropriate for the specified role.</returns>
    [HttpGet("/api/v1/dashboards/{role}")]
    [Authorize(Policy = PolicyNames.CanViewDashboards)]
    [ProducesResponseType(typeof(DashboardData), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetDashboard([FromRoute] string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return BadRequestResponse("Role parameter is required.");

        var dashboard = await _reportGeneratorService.GetDashboardDataAsync(role, CurrentUser);
        return OkResponse(dashboard);
    }
}

/// <summary>
/// Request body for generating a report.
/// </summary>
public class GenerateReportRequest
{
    /// <summary>
    /// The type of report to generate.
    /// Valid values: RecordsPerDepartmentMonth, PendingDisposal, PhysicalFileMovements, StorageUtilization, ComplianceStatus
    /// </summary>
    public string ReportType { get; set; } = string.Empty;

    /// <summary>
    /// Output format: "pdf" or "excel" (CSV).
    /// </summary>
    public string? Format { get; set; } = "pdf";

    /// <summary>
    /// Start date for the report period (optional).
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// End date for the report period (optional).
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// Filter by department code (optional).
    /// </summary>
    public string? DepartmentCode { get; set; }

    /// <summary>
    /// Filter by classification level (optional).
    /// </summary>
    public int? ClassificationLevel { get; set; }
}
