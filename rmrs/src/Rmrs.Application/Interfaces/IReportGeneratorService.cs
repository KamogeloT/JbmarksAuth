namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for generating pre-built reports in PDF and Excel formats,
/// and for providing role-based dashboard data.
/// Implements Requirements 12.1, 12.2, 12.3, 12.4, 12.5.
/// </summary>
public interface IReportGeneratorService
{
    /// <summary>
    /// Generates a report in the specified format (PDF or Excel/CSV).
    /// Access control is applied: users see only data from departments 
    /// and classification levels they are authorized to access.
    /// </summary>
    /// <param name="type">The type of report to generate.</param>
    /// <param name="parameters">Report parameters including filters and date ranges.</param>
    /// <param name="format">Output format: "pdf" or "excel".</param>
    /// <param name="userContext">The current user's context for access filtering.</param>
    /// <returns>The generated report as a byte array.</returns>
    Task<byte[]> GenerateReportAsync(ReportType type, ReportParameters parameters, string format, IUserContext userContext);

    /// <summary>
    /// Gets dashboard data for a specific role.
    /// </summary>
    /// <param name="role">The role for which to generate dashboard data.</param>
    /// <param name="userContext">The current user's context for access filtering.</param>
    /// <returns>Dashboard data appropriate for the specified role.</returns>
    Task<DashboardData> GetDashboardDataAsync(string role, IUserContext userContext);

    /// <summary>
    /// Returns the list of available report types.
    /// </summary>
    /// <returns>A collection of available report type descriptors.</returns>
    IEnumerable<ReportTypeDescriptor> GetAvailableReportTypes();
}

/// <summary>
/// Enumeration of pre-built report types.
/// </summary>
public enum ReportType
{
    /// <summary>Records registered per department per month.</summary>
    RecordsPerDepartmentMonth,

    /// <summary>Records pending disposal.</summary>
    PendingDisposal,

    /// <summary>Physical file movement summary.</summary>
    PhysicalFileMovements,

    /// <summary>Storage utilization by department.</summary>
    StorageUtilization,

    /// <summary>Compliance status summary.</summary>
    ComplianceStatus
}

/// <summary>
/// Parameters for report generation including filters and date ranges.
/// </summary>
public class ReportParameters
{
    /// <summary>Start date for the report period.</summary>
    public DateTime? FromDate { get; set; }

    /// <summary>End date for the report period.</summary>
    public DateTime? ToDate { get; set; }

    /// <summary>Filter by department code (optional).</summary>
    public string? DepartmentCode { get; set; }

    /// <summary>Filter by classification level (optional).</summary>
    public int? ClassificationLevel { get; set; }
}

/// <summary>
/// Descriptor for an available report type.
/// </summary>
public class ReportTypeDescriptor
{
    /// <summary>Machine-readable report type identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Human-readable name of the report.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Description of what the report contains.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Supported export formats (e.g., "pdf", "excel").</summary>
    public List<string> SupportedFormats { get; set; } = new();
}

/// <summary>
/// Dashboard data returned for role-based dashboards.
/// </summary>
public class DashboardData
{
    /// <summary>Role this dashboard is for.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Timestamp when the dashboard data was generated.</summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Dashboard widgets/metrics.</summary>
    public Dictionary<string, object> Metrics { get; set; } = new();
}
