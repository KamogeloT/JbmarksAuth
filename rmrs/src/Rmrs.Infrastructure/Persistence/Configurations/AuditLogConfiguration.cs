using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.UserId).IsRequired();
        builder.Property(e => e.Timestamp).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.ActionType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.EntityId).IsRequired();
        builder.Property(e => e.SourceIpAddress).IsRequired().HasMaxLength(45);

        // Performance indexes
        builder.HasIndex(e => e.Timestamp).HasDatabaseName("IX_AuditLogs_Timestamp");
        builder.HasIndex(e => new { e.EntityType, e.EntityId }).HasDatabaseName("IX_AuditLogs_EntityType_EntityId");
        builder.HasIndex(e => e.UserId).HasDatabaseName("IX_AuditLogs_UserId");
    }
}
