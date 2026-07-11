using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Generates pre-built reports in PDF (QuestPDF) and Excel/CSV formats.
/// Applies access control so users only see data from authorized departments/classification levels.
/// Implements Requirements 12.1, 12.2, 12.3, 12.4, 12.5.
/// </summary>
public class ReportGeneratorService : IReportGeneratorService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IComplianceDashboardService _complianceDashboardService;
    private readonly ILogger<ReportGeneratorService> _logger;

    private static readonly List<ReportTypeDescriptor> _reportTypes = new()
    {
        new ReportTypeDescriptor
        {
            Id = "records_per_department_month",
            Name = "Records Per Department/Month",
            Description = "Records registered per department per month for the specified period.",
            SupportedFormats = new List<string> { "pdf", "excel" }
        },
        new ReportTypeDescriptor
        {
            Id = "pending_disposal",
            Name = "Pending Disposal",
            Description = "Records pending disposal (retention expired, not yet disposed).",
            SupportedFormats = new List<string> { "pdf", "excel" }
        },
        new ReportTypeDescriptor
        {
            Id = "physical_file_movements",
            Name = "Physical File Movements",
            Description = "Summary of physical file movements during the specified period.",
            SupportedFormats = new List<string> { "pdf", "excel" }
        },
        new ReportTypeDescriptor
        {
            Id = "storage_utilization",
            Name = "Storage Utilization",
            Description = "Storage utilization by department.",
            SupportedFormats = new List<string> { "pdf", "excel" }
        },
        new ReportTypeDescriptor
        {
            Id = "compliance_status",
            Name = "Compliance Status",
            Description = "Compliance status summary including pending disposals, overdue disposals, and file plan coverage.",
            SupportedFormats = new List<string> { "pdf", "excel" }
        }
    };

    public ReportGeneratorService(
        RmrsDbContext dbContext,
        IComplianceDashboardService complianceDashboardService,
        ILogger<ReportGeneratorService> logger)
    {
        _dbContext = dbContext;
        _complianceDashboardService = complianceDashboardService;
        _logger = logger;
    }

    /// <inheritdoc />
    public IEnumerable<ReportTypeDescriptor> GetAvailableReportTypes() => _reportTypes;

    /// <inheritdoc />
    public async Task<byte[]> GenerateReportAsync(
        ReportType type, ReportParameters parameters, string format, IUserContext userContext)
    {
        _logger.LogInformation(
            "Generating report {Type} in format {Format} for user {UserId}",
            type, format, userContext.UserId);

        var reportData = await GetReportDataAsync(type, parameters, userContext);

        return format.ToLowerInvariant() switch
        {
            "pdf" => GeneratePdf(type, reportData, parameters),
            "excel" or "csv" => GenerateExcel(type, reportData, parameters),
            _ => throw new ArgumentException($"Unsupported format: {format}. Use 'pdf' or 'excel'.")
        };
    }

    /// <inheritdoc />
    public async Task<DashboardData> GetDashboardDataAsync(string role, IUserContext userContext)
    {
        _logger.LogInformation("Getting dashboard data for role {Role}, user {UserId}", role, userContext.UserId);

        var dashboard = new DashboardData { Role = role };

        switch (role.ToLowerInvariant())
        {
            case "records_manager":
                dashboard.Metrics = await GetRecordsManagerDashboardAsync(userContext);
                break;
            case "executive_viewer":
                dashboard.Metrics = await GetExecutiveDashboardAsync();
                break;
            case "compliance":
            case "compliance_officer":
                dashboard.Metrics = await GetComplianceDashboardAsync();
                break;
            default:
                dashboard.Metrics = await GetDefaultDashboardAsync(userContext);
                break;
        }

        return dashboard;
    }

    private async Task<Dictionary<string, object>> GetRecordsManagerDashboardAsync(IUserContext userContext)
    {
        var today = DateTime.UtcNow.Date;
        var metrics = new Dictionary<string, object>();

        // Daily registration counts
        var dailyRegistrations = await _dbContext.Records
            .CountAsync(r => r.CreatedAt.Date == today);
        metrics["dailyRegistrationCount"] = dailyRegistrations;

        // Overdue loans
        var overdueLoans = await _dbContext.Loans
            .CountAsync(l => l.Status == "Active"
                && l.ActualReturnDate == null
                && l.ExpectedReturnDate < today);
        metrics["overdueLoans"] = overdueLoans;

        // Upcoming disposals (within 30 days)
        var upcomingDisposalDate = today.AddDays(30);
        var upcomingDisposals = await _dbContext.Records
            .CountAsync(r => r.Status == "Active"
                && r.RetentionExpiryDate != null
                && r.RetentionExpiryDate <= upcomingDisposalDate
                && r.RetentionExpiryDate > today);
        metrics["upcomingDisposals"] = upcomingDisposals;

        // Transfer batch status
        var activeBatches = await _dbContext.TransferBatches
            .Where(tb => tb.Status != "Completed")
            .Select(tb => new { tb.BatchNumber, tb.Status, tb.CreatedAt })
            .ToListAsync();
        metrics["activeTransferBatches"] = activeBatches;

        return metrics;
    }

    private async Task<Dictionary<string, object>> GetExecutiveDashboardAsync()
    {
        var metrics = new Dictionary<string, object>();

        // Aggregate statistics across all departments
        var totalRecords = await _dbContext.Records.CountAsync();
        var totalActiveRecords = await _dbContext.Records.CountAsync(r => r.Status == "Active");
        var totalDepartments = await _dbContext.Departments.CountAsync(d => d.IsActive);

        // Records per department
        var recordsByDepartment = await _dbContext.Records
            .GroupBy(r => r.Department.DepartmentName)
            .Select(g => new { Department = g.Key, Count = g.Count() })
            .ToListAsync();

        // Monthly trend (last 6 months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var monthlyTrend = await _dbContext.Records
            .Where(r => r.CreatedAt >= sixMonthsAgo)
            .GroupBy(r => new { r.CreatedAt.Year, r.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        metrics["totalRecords"] = totalRecords;
        metrics["totalActiveRecords"] = totalActiveRecords;
        metrics["totalDepartments"] = totalDepartments;
        metrics["recordsByDepartment"] = recordsByDepartment;
        metrics["monthlyTrend"] = monthlyTrend;

        return metrics;
    }

    private async Task<Dictionary<string, object>> GetComplianceDashboardAsync()
    {
        var complianceMetrics = await _complianceDashboardService.GetComplianceMetricsAsync();
        var metrics = new Dictionary<string, object>
        {
            ["pendingDisposals"] = complianceMetrics.PendingDisposals,
            ["overdueDisposals"] = complianceMetrics.OverdueDisposals,
            ["recordsApproachingRetentionExpiry"] = complianceMetrics.RecordsApproachingRetentionExpiry,
            ["filePlanCoveragePercentage"] = complianceMetrics.FilePlanCoveragePercentage,
            ["computedAt"] = complianceMetrics.ComputedAt
        };

        return metrics;
    }

    private async Task<Dictionary<string, object>> GetDefaultDashboardAsync(IUserContext userContext)
    {
        var metrics = new Dictionary<string, object>();

        // Basic stats for the user's department
        var query = _dbContext.Records.AsQueryable();
        if (userContext.DepartmentCode != null)
        {
            query = query.Where(r => r.Department.DepartmentCode == userContext.DepartmentCode);
        }

        var totalRecords = await query.CountAsync();
        metrics["totalRecords"] = totalRecords;

        return metrics;
    }

    private async Task<ReportData> GetReportDataAsync(
        ReportType type, ReportParameters parameters, IUserContext userContext)
    {
        var data = new ReportData { ReportType = type };
        var query = ApplyAccessFilter(_dbContext.Records.AsQueryable(), userContext);

        // Apply date filters
        if (parameters.FromDate.HasValue)
            query = query.Where(r => r.CreatedAt >= parameters.FromDate.Value);
        if (parameters.ToDate.HasValue)
            query = query.Where(r => r.CreatedAt <= parameters.ToDate.Value);
        if (!string.IsNullOrEmpty(parameters.DepartmentCode))
            query = query.Where(r => r.Department.DepartmentCode == parameters.DepartmentCode);

        switch (type)
        {
            case ReportType.RecordsPerDepartmentMonth:
                data.Rows = await query
                    .GroupBy(r => new { r.Department.DepartmentName, r.CreatedAt.Year, r.CreatedAt.Month })
                    .Select(g => new ReportRow
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Department"] = g.Key.DepartmentName,
                            ["Year"] = g.Key.Year.ToString(),
                            ["Month"] = g.Key.Month.ToString(),
                            ["Count"] = g.Count().ToString()
                        }
                    })
                    .ToListAsync();
                data.Columns = new[] { "Department", "Year", "Month", "Count" };
                break;

            case ReportType.PendingDisposal:
                var now = DateTime.UtcNow;
                data.Rows = await query
                    .Where(r => r.Status == "Active"
                        && r.RetentionExpiryDate != null
                        && r.RetentionExpiryDate <= now)
                    .Select(r => new ReportRow
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["RegistryNumber"] = r.RegistryNumber,
                            ["Subject"] = r.Subject,
                            ["Department"] = r.Department.DepartmentName,
                            ["RetentionExpiry"] = r.RetentionExpiryDate!.Value.ToString("yyyy-MM-dd"),
                            ["Status"] = r.Status
                        }
                    })
                    .ToListAsync();
                data.Columns = new[] { "RegistryNumber", "Subject", "Department", "RetentionExpiry", "Status" };
                break;

            case ReportType.PhysicalFileMovements:
                var movementsQuery = _dbContext.PhysicalRecordMovements
                    .Include(m => m.PhysicalRecord)
                        .ThenInclude(pr => pr.Record)
                            .ThenInclude(r => r.Department)
                    .AsQueryable();

                if (parameters.FromDate.HasValue)
                    movementsQuery = movementsQuery.Where(m => m.MovedAt >= parameters.FromDate.Value);
                if (parameters.ToDate.HasValue)
                    movementsQuery = movementsQuery.Where(m => m.MovedAt <= parameters.ToDate.Value);

                // Apply department filter for access control
                if (userContext.DepartmentCode != null)
                {
                    movementsQuery = movementsQuery.Where(m =>
                        m.PhysicalRecord.Record.Department.DepartmentCode == userContext.DepartmentCode);
                }

                data.Rows = await movementsQuery
                    .Select(m => new ReportRow
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["RegistryNumber"] = m.PhysicalRecord.Record.RegistryNumber,
                            ["MovedAt"] = m.MovedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["FromLocation"] = m.FromLocationId != null ? m.FromLocationId.ToString()! : "N/A",
                            ["ToLocation"] = m.ToLocationId.ToString()
                        }
                    })
                    .ToListAsync();
                data.Columns = new[] { "RegistryNumber", "MovedAt", "FromLocation", "ToLocation" };
                break;

            case ReportType.StorageUtilization:
                var storageQuery = _dbContext.Documents
                    .Include(d => d.Record)
                        .ThenInclude(r => r.Department)
                    .AsQueryable();

                if (userContext.DepartmentCode != null)
                {
                    storageQuery = storageQuery.Where(d =>
                        d.Record.Department.DepartmentCode == userContext.DepartmentCode);
                }

                data.Rows = await storageQuery
                    .GroupBy(d => d.Record.Department.DepartmentName)
                    .Select(g => new ReportRow
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Department"] = g.Key,
                            ["FileCount"] = g.Count().ToString(),
                            ["TotalSizeMB"] = (g.Sum(d => d.FileSize) / (1024.0 * 1024.0)).ToString("F2")
                        }
                    })
                    .ToListAsync();
                data.Columns = new[] { "Department", "FileCount", "TotalSizeMB" };
                break;

            case ReportType.ComplianceStatus:
                var complianceMetrics = await _complianceDashboardService.GetComplianceMetricsAsync();
                data.Rows = new List<ReportRow>
                {
                    new()
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Metric"] = "Pending Disposals",
                            ["Value"] = complianceMetrics.PendingDisposals.ToString()
                        }
                    },
                    new()
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Metric"] = "Overdue Disposals",
                            ["Value"] = complianceMetrics.OverdueDisposals.ToString()
                        }
                    },
                    new()
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Metric"] = "Records Approaching Retention Expiry",
                            ["Value"] = complianceMetrics.RecordsApproachingRetentionExpiry.ToString()
                        }
                    },
                    new()
                    {
                        Values = new Dictionary<string, string>
                        {
                            ["Metric"] = "File Plan Coverage (%)",
                            ["Value"] = complianceMetrics.FilePlanCoveragePercentage.ToString("F2")
                        }
                    }
                };
                data.Columns = new[] { "Metric", "Value" };
                break;
        }

        return data;
    }

    /// <summary>
    /// Applies the same access control rules as search (Requirement 12.5).
    /// Users only see data from departments and classification levels they are authorized to access.
    /// </summary>
    private IQueryable<Domain.Entities.Record> ApplyAccessFilter(
        IQueryable<Domain.Entities.Record> query, IUserContext userContext)
    {
        // Apply classification level filter
        query = query.Where(r => r.ClassificationLevel <= userContext.MaxClassificationLevel);

        // Apply department isolation for department-scoped roles
        if (userContext.DepartmentCode != null &&
            !userContext.HasRole(Domain.Enums.UserRole.SystemAdministrator) &&
            !userContext.HasRole(Domain.Enums.UserRole.RecordsManager) &&
            !userContext.HasRole(Domain.Enums.UserRole.ComplianceOfficer) &&
            !userContext.HasRole(Domain.Enums.UserRole.Auditor))
        {
            query = query.Where(r => r.Department.DepartmentCode == userContext.DepartmentCode);
        }

        return query;
    }

    private byte[] GeneratePdf(ReportType type, ReportData data, ReportParameters parameters)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);

                page.Header().Text(text =>
                {
                    text.Span("RMRS Report: ").Bold().FontSize(16);
                    text.Span(GetReportTitle(type)).FontSize(16);
                });

                page.Content().PaddingVertical(10).Column(col =>
                {
                    // Report parameters
                    col.Item().Text(text =>
                    {
                        text.Span("Generated: ").Bold();
                        text.Span(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"));
                    });

                    if (parameters.FromDate.HasValue || parameters.ToDate.HasValue)
                    {
                        col.Item().Text(text =>
                        {
                            text.Span("Period: ").Bold();
                            text.Span($"{parameters.FromDate?.ToString("yyyy-MM-dd") ?? "N/A"} to {parameters.ToDate?.ToString("yyyy-MM-dd") ?? "N/A"}");
                        });
                    }

                    col.Item().PaddingTop(10);

                    // Table
                    if (data.Columns.Length > 0 && data.Rows.Count > 0)
                    {
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                for (int i = 0; i < data.Columns.Length; i++)
                                    columns.RelativeColumn();
                            });

                            // Header
                            foreach (var column in data.Columns)
                            {
                                table.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                                    .Text(column).Bold();
                            }

                            // Rows
                            foreach (var row in data.Rows)
                            {
                                foreach (var column in data.Columns)
                                {
                                    var value = row.Values.GetValueOrDefault(column, "");
                                    table.Cell().Padding(5).Text(value);
                                }
                            }
                        });
                    }
                    else
                    {
                        col.Item().Text("No data available for the specified parameters.");
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("RMRS - Records Management and Registry System | Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private byte[] GenerateExcel(ReportType type, ReportData data, ReportParameters parameters)
    {
        // Generate CSV format (Excel-compatible)
        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream);

        // Header row
        writer.WriteLine(string.Join(",", data.Columns.Select(EscapeCsvField)));

        // Data rows
        foreach (var row in data.Rows)
        {
            var values = data.Columns.Select(col =>
                EscapeCsvField(row.Values.GetValueOrDefault(col, "")));
            writer.WriteLine(string.Join(",", values));
        }

        writer.Flush();
        return memoryStream.ToArray();
    }

    private static string EscapeCsvField(string field)
    {
        if (field.Contains(',') || field.Contains('"') || field.Contains('\n'))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }
        return field;
    }

    private static string GetReportTitle(ReportType type) => type switch
    {
        ReportType.RecordsPerDepartmentMonth => "Records Per Department/Month",
        ReportType.PendingDisposal => "Pending Disposal",
        ReportType.PhysicalFileMovements => "Physical File Movements",
        ReportType.StorageUtilization => "Storage Utilization",
        ReportType.ComplianceStatus => "Compliance Status",
        _ => "Report"
    };
}

/// <summary>
/// Internal report data container.
/// </summary>
internal class ReportData
{
    public ReportType ReportType { get; set; }
    public string[] Columns { get; set; } = Array.Empty<string>();
    public List<ReportRow> Rows { get; set; } = new();
}

/// <summary>
/// A single row in a report.
/// </summary>
internal class ReportRow
{
    public Dictionary<string, string> Values { get; set; } = new();
}
