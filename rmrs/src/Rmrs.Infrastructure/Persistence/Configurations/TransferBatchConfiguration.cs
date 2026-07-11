using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class TransferBatchConfiguration : IEntityTypeConfiguration<TransferBatch>
{
    public void Configure(EntityTypeBuilder<TransferBatch> builder)
    {
        builder.ToTable("TransferBatches");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.BatchNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.BatchNumber).IsUnique();

        builder.Property(e => e.DestinationArchive).IsRequired().HasMaxLength(256);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Draft");
        builder.Property(e => e.CreatedByUserId).IsRequired();
        builder.Property(e => e.ArchiveReferenceNumber).HasMaxLength(100);
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(e => e.CreatedByUser)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
