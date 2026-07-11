using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> builder)
    {
        builder.ToTable("DocumentVersions");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.DocumentId).IsRequired();
        builder.Property(e => e.VersionNumber).IsRequired();
        builder.Property(e => e.BitrixFileId).IsRequired();
        builder.Property(e => e.Sha256Checksum).IsRequired().HasMaxLength(64);
        builder.Property(e => e.FileSize).IsRequired();
        builder.Property(e => e.UploadedByUserId).IsRequired();
        builder.Property(e => e.UploadedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        // Unique constraint on DocumentId + VersionNumber
        builder.HasIndex(e => new { e.DocumentId, e.VersionNumber })
            .IsUnique()
            .HasDatabaseName("UQ_DocVersion");

        // Performance index on checksum
        builder.HasIndex(e => e.Sha256Checksum).HasDatabaseName("IX_DocumentVersions_Checksum");

        builder.HasOne(e => e.Document)
            .WithMany(d => d.Versions)
            .HasForeignKey(e => e.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.UploadedByUser)
            .WithMany()
            .HasForeignKey(e => e.UploadedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
