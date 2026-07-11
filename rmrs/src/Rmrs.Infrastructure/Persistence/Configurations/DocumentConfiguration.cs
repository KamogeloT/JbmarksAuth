using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> builder)
    {
        builder.ToTable("Documents");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.RecordId).IsRequired();
        builder.Property(e => e.FileName).IsRequired().HasMaxLength(256);
        builder.Property(e => e.FileSize).IsRequired();
        builder.Property(e => e.MimeType).IsRequired().HasMaxLength(100);
        builder.Property(e => e.CurrentVersion).IsRequired().HasDefaultValue(1);
        builder.Property(e => e.BitrixFileId).IsRequired();
        builder.Property(e => e.BitrixFolderId).IsRequired();
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(e => e.Record)
            .WithMany(r => r.Documents)
            .HasForeignKey(e => e.RecordId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
