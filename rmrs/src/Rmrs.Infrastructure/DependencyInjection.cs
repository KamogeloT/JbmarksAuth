using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Rmrs.Application.Interfaces;
using Rmrs.Infrastructure.BackgroundJobs;
using Rmrs.Infrastructure.Persistence;
using Rmrs.Infrastructure.Services;
using Rmrs.Infrastructure.Services.Bitrix;

namespace Rmrs.Infrastructure;

/// <summary>
/// Extension methods for registering Infrastructure layer services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // UserContext - provides current user information from HttpContext
        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, UserContext>();

        // Token Service - OAuth token exchange, encryption, and storage
        services.AddScoped<ITokenService, TokenService>();

        // Data Protection API (for token encryption at rest)
        services.AddDataProtection();

        // Register the AuditSaveChangesInterceptor
        services.AddScoped<AuditSaveChangesInterceptor>();

        // Audit Log Service - append-only write and query capabilities
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Compliance Dashboard Service - metrics and report generation
        services.AddScoped<IComplianceDashboardService, ComplianceDashboardService>();

        // Department Mapping Service - CRUD for department-to-workgroup mappings
        services.AddScoped<IDepartmentMappingService, DepartmentMappingService>();

        // Role Service - role assignment and management
        services.AddScoped<IRoleService, RoleService>();

        // Document Upload Service - orchestrates upload with checksum and retry logic
        services.AddScoped<IDocumentUploadService, DocumentUploadService>();

        // Bitrix Folder Service - creates folder hierarchies mirroring file plan
        services.AddScoped<IBitrixFolderService, BitrixFolderService>();

        // Barcode Generator Service - Code128 barcode and QR code generation
        services.AddScoped<IBarcodeGeneratorService, BarcodeGeneratorService>();

        // Location Service - storage hierarchy CRUD and movement operations
        services.AddScoped<ILocationService, LocationService>();

        // Loan Service - loan lifecycle management and overdue detection
        services.AddScoped<ILoanService, LoanService>();

        // Checksum Service - SHA-256 computation and integrity verification
        services.AddScoped<IChecksumService, ChecksumService>();

        // File Plan Service - hierarchical file plan CRUD and tree management
        services.AddScoped<IFilePlanService, FilePlanService>();

        // Retention Rule Service - CRUD for retention rules
        services.AddScoped<IRetentionRuleService, RetentionRuleService>();

        // Retention Rule Engine - calculates expiry dates and identifies disposal candidates
        services.AddScoped<IRetentionRuleEngine, RetentionRuleEngine>();

        // In-memory cache for file plan tree and other frequently accessed data
        services.AddMemoryCache();

        // Registry Number Generator - atomic sequence allocation per department/year
        services.AddScoped<IRegistryNumberGenerator, RegistryNumberGenerator>();

        // Record Registration Service - orchestrates record registration workflow
        services.AddScoped<IRecordRegistrationService, RecordRegistrationService>();

        // Disposal Workflow Service - full disposal lifecycle management
        services.AddScoped<IDisposalWorkflowService, DisposalWorkflowService>();

        // Transfer Batch Service - archive transfer batch workflow
        services.AddScoped<ITransferBatchService, TransferBatchService>();

        // Transfer Manifest Generator - QuestPDF manifest generation
        services.AddScoped<ITransferManifestGenerator, TransferManifestGenerator>();

        // Search Service - full-text search with access filtering
        services.AddScoped<ISearchService, SearchService>();

        // Report Generator Service - PDF/Excel report generation and dashboard data
        services.AddScoped<IReportGeneratorService, ReportGeneratorService>();

        // Configuration Service - system config CRUD with validation and audit
        services.AddScoped<IConfigurationService, ConfigurationService>();

        // Lookup Table Service - CRUD for system lookup values
        services.AddScoped<ILookupTableService, LookupTableService>();

        // Scheduled Job Service - background job configuration management
        services.AddScoped<IScheduledJobService, ScheduledJobService>();

        // RetentionCalculationJob - IHostedService running daily at 02:00
        services.AddHostedService<RetentionCalculationJob>();

        // OverdueLoanNotifierJob - IHostedService running daily at 08:00
        services.AddHostedService<OverdueLoanNotifierJob>();

        // EF Core DbContext registration with SQL Server
        services.AddDbContext<RmrsDbContext>((serviceProvider, options) =>
        {
            var interceptor = serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>();

            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                sqlOptions =>
                {
                    sqlOptions.MigrationsAssembly(typeof(RmrsDbContext).Assembly.FullName);
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorNumbersToAdd: null);
                });

            options.AddInterceptors(interceptor);
        });

        // Bitrix API Client
        services.AddBitrixApiClient(configuration);

        // Repository registrations will be added per module

        return services;
    }

    private static IServiceCollection AddBitrixApiClient(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Bind Bitrix settings from configuration
        var bitrixSettings = new BitrixApiSettings();
        configuration.GetSection(BitrixApiSettings.SectionName).Bind(bitrixSettings);
        services.Configure<BitrixApiSettings>(configuration.GetSection(BitrixApiSettings.SectionName));

        // Register retry policy
        services.AddSingleton<BitrixRetryPolicy>();

        // Register named HttpClient for Bitrix Platform REST API
        services.AddHttpClient("BitrixPlatform", client =>
        {
            client.BaseAddress = new Uri(bitrixSettings.PlatformBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        // Register named HttpClient for Bitrix OAuth server
        services.AddHttpClient("BitrixOAuth", client =>
        {
            client.BaseAddress = new Uri(bitrixSettings.OAuthBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        // Register the Bitrix API client as the interface implementation
        services.AddScoped<IBitrixApiClient, BitrixApiClient>();

        return services;
    }
}
