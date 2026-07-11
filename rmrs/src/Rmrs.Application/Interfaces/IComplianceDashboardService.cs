namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for computing compliance dashboard metrics and generating compliance reports.
/// Implements Requirements 11.4, 11.5, 11.6.
/// </summary>
public interface IComplianceDashboardService
{
    /// <summary>
    /// Retrieves compliance metrics including pending disposals, overdue disposals,
    /// records approaching retention expiry, and file plan coverage percentage.
    /// </summary>
    /// <returns>Compliance metrics data.</returns>
    Task<ComplianceMetrics> GetComplianceMetricsAsync();

    /// <summary>
    /// Generates a compliance report for the specified date range.
    /// Must complete within 10 seconds for data spanning up to 12 months.
    /// </summary>
    /// <param name="request">The report generation request with date range parameters.</param>
    /// <returns>The generated compliance report.</returns>
    Task<ComplianceReport> GenerateComplianceReportAsync(ComplianceReportRequest request);
}

/// <summary>
/// Compliance dashboard metrics.
/// </summary>
public class ComplianceMetrics
{
    /// <summary>
    /// Number of records pending disposal (retention expired, not yet disposed).
    /// </summary>
    public int PendingDisposals { get; set; }

    /// <summary>
    /// Number of records that are overdue for disposal (past retention expiry by more than 30 days).
    /// </summary>
    public int OverdueDisposals { get; set; }

    /// <summary>
    /// Number of records approaching retention expiry (within next 90 days).
    /// </summary>
    public int RecordsApproachingRetentionExpiry { get; set; }

    /// <summary>
    /// Percentage of active records that are classified under an active file plan entry.
    /// </summary>
    public double FilePlanCoveragePercentage { get; set; }

    /// <summary>
    /// Timestamp when metrics were computed.
    /// </summary>
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Request parameters for generating a compliance report.
/// </summary>
public class ComplianceReportRequest
{
    /// <summary>
    /// Start date for the report period.
    /// </summary>
    public DateTime FromDate { get; set; }

    /// <summary>
    /// End date for the report period.
    /// </summary>
    public DateTime ToDate { get; set; }
}

/// <summary>
/// Generated compliance report data.
/// </summary>
public class ComplianceReport
{
    /// <summary>
    /// Unique identifier for this report.
    /// </summary>
    public string ReportId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Start date of the reporting period.
    /// </summary>
    public DateTime FromDate { get; set; }

    /// <summary>
    /// End date of the reporting period.
    /// </summary>
    public DateTime ToDate { get; set; }

    /// <summary>
    /// Timestamp when the report was generated.
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Total number of records created during the reporting period.
    /// </summary>
    public int TotalRecordsCreated { get; set; }

    /// <summary>
    /// Total number of records disposed during the reporting period.
    /// </summary>
    public int TotalRecordsDisposed { get; set; }

    /// <summary>
    /// Total number of records archived during the reporting period.
    /// </summary>
    public int TotalRecordsArchived { get; set; }

    /// <summary>
    /// Number of disposal batches processed during the reporting period.
    /// </summary>
    public int DisposalBatchesProcessed { get; set; }

    /// <summary>
    /// Compliance metrics snapshot at report generation time.
    /// </summary>
    public ComplianceMetrics CurrentMetrics { get; set; } = new();

    /// <summary>
    /// Breakdown of audit log activity during the reporting period.
    /// </summary>
    public AuditActivitySummary AuditActivity { get; set; } = new();
}

/// <summary>
/// Summary of audit log activity for a given period.
/// </summary>
public class AuditActivitySummary
{
    /// <summary>
    /// Total audit log entries during the period.
    /// </summary>
    public int TotalEntries { get; set; }

    /// <summary>
    /// Number of create operations.
    /// </summary>
    public int CreateOperations { get; set; }

    /// <summary>
    /// Number of update operations.
    /// </summary>
    public int UpdateOperations { get; set; }

    /// <summary>
    /// Number of delete operations.
    /// </summary>
    public int DeleteOperations { get; set; }

    /// <summary>
    /// Number of read operations.
    /// </summary>
    public int ReadOperations { get; set; }
}
