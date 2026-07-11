using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DisposalBatchRecordConfiguration : IEntityTypeConfiguration<DisposalBatchRecord>
{
    public void Configure(EntityTypeBuilder<DisposalBatchRecord> builder)
    {
        builder.ToTable("DisposalBatchRecords");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.DisposalBatchId).IsRequired();
        builder.Property(e => e.RecordId).IsRequired();
        builder.Property(e => e.DisposalStatus).IsRequired().HasMaxLength(30).HasDefaultValue("Pending");

        builder.HasIndex(e => new { e.DisposalBatchId, e.RecordId })
            .IsUnique()
            .HasDatabaseName("UQ_DisposalBatchRecord");

        builder.HasOne(e => e.DisposalBatch)
            .WithMany(b => b.DisposalBatchRecords)
            .HasForeignKey(e => e.DisposalBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Record)
            .WithMany()
            .HasForeignKey(e => e.RecordId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
