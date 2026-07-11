using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class RecordConfiguration : IEntityTypeConfiguration<Record>
{
    public void Configure(EntityTypeBuilder<Record> builder)
    {
        builder.ToTable("Records");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.RegistryNumber).IsRequired().HasMaxLength(30);
        builder.HasIndex(e => e.RegistryNumber).IsUnique();

        builder.Property(e => e.RecordType).IsRequired().HasMaxLength(20);
        builder.ToTable(t => t.HasCheckConstraint("CK_Records_RecordType",
            "[RecordType] IN ('Incoming', 'Outgoing', 'Internal')"));

        builder.Property(e => e.Subject).IsRequired().HasMaxLength(500);
        builder.Property(e => e.SenderOrRecipient).HasMaxLength(256);
        builder.Property(e => e.DateReceivedOrSent).IsRequired();
        builder.Property(e => e.FilePlanEntryId).IsRequired();
        builder.Property(e => e.ClassificationLevel).IsRequired();
        builder.Property(e => e.ResponsibleOfficerId).IsRequired();
        builder.Property(e => e.DepartmentId).IsRequired();
        builder.Property(e => e.ExternalReferenceNumber).HasMaxLength(100);
        builder.Property(e => e.OriginatingOrganization).HasMaxLength(256);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Active");
        builder.Property(e => e.CreatedByUserId).IsRequired();
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.UpdatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        // Performance indexes
        builder.HasIndex(e => e.DepartmentId).HasDatabaseName("IX_Records_DepartmentId");
        builder.HasIndex(e => e.FilePlanEntryId).HasDatabaseName("IX_Records_FilePlanEntryId");
        builder.HasIndex(e => e.Status).HasDatabaseName("IX_Records_Status");
        builder.HasIndex(e => e.RetentionExpiryDate).HasDatabaseName("IX_Records_RetentionExpiryDate");

        // Relationships
        builder.HasOne(e => e.FilePlanEntry)
            .WithMany(f => f.Records)
            .HasForeignKey(e => e.FilePlanEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ResponsibleOfficer)
            .WithMany()
            .HasForeignKey(e => e.ResponsibleOfficerId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.Department)
            .WithMany(d => d.Records)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.CreatedByUser)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
