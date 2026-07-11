using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class TransferBatchRecordConfiguration : IEntityTypeConfiguration<TransferBatchRecord>
{
    public void Configure(EntityTypeBuilder<TransferBatchRecord> builder)
    {
        builder.ToTable("TransferBatchRecords");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.TransferBatchId).IsRequired();
        builder.Property(e => e.RecordId).IsRequired();
        builder.Property(e => e.ValidationStatus).IsRequired().HasMaxLength(30).HasDefaultValue("Pending");

        builder.HasIndex(e => new { e.TransferBatchId, e.RecordId })
            .IsUnique()
            .HasDatabaseName("UQ_TransferBatchRecord");

        builder.HasOne(e => e.TransferBatch)
            .WithMany(b => b.TransferBatchRecords)
            .HasForeignKey(e => e.TransferBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Record)
            .WithMany()
            .HasForeignKey(e => e.RecordId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
