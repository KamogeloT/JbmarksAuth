using Microsoft.EntityFrameworkCore;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence;

/// <summary>
/// Primary database context for the RMRS application.
/// Uses SQL Server 2022 with full-text search support.
/// </summary>
public class RmrsDbContext : DbContext
{
    public RmrsDbContext(DbContextOptions<RmrsDbContext> options) : base(options)
    {
    }

    // Authentication & Users
    public DbSet<User> Users => Set<User>();
    public DbSet<UserToken> UserTokens => Set<UserToken>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    // Department Mapping
    public DbSet<Department> Departments => Set<Department>();

    // File Plan
    public DbSet<FilePlanEntry> FilePlanEntries => Set<FilePlanEntry>();
    public DbSet<RetentionRule> RetentionRules => Set<RetentionRule>();

    // Records Registry
    public DbSet<Record> Records => Set<Record>();
    public DbSet<RegistrySequence> RegistrySequences => Set<RegistrySequence>();

    // Electronic Documents
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();

    // Physical Records
    public DbSet<StorageLocation> StorageLocations => Set<StorageLocation>();
    public DbSet<PhysicalRecord> PhysicalRecords => Set<PhysicalRecord>();
    public DbSet<PhysicalRecordMovement> PhysicalRecordMovements => Set<PhysicalRecordMovement>();
    public DbSet<Loan> Loans => Set<Loan>();

    // Disposal
    public DbSet<DisposalBatch> DisposalBatches => Set<DisposalBatch>();
    public DbSet<DisposalBatchRecord> DisposalBatchRecords => Set<DisposalBatchRecord>();
    public DbSet<DisposalCertificate> DisposalCertificates => Set<DisposalCertificate>();

    // Archive Transfer
    public DbSet<TransferBatch> TransferBatches => Set<TransferBatch>();
    public DbSet<TransferBatchRecord> TransferBatchRecords => Set<TransferBatchRecord>();

    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Configuration
    public DbSet<SystemConfiguration> SystemConfigurations => Set<SystemConfiguration>();
    public DbSet<LookupValue> LookupValues => Set<LookupValue>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all IEntityTypeConfiguration classes from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(RmrsDbContext).Assembly);
    }
}
