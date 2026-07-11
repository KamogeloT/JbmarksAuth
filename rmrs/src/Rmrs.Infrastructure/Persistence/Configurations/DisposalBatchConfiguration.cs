using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DisposalBatchConfiguration : IEntityTypeConfiguration<DisposalBatch>
{
    public void Configure(EntityTypeBuilder<DisposalBatch> builder)
    {
        builder.ToTable("DisposalBatches");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.BatchNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.BatchNumber).IsUnique();

        builder.Property(e => e.DisposalAuthorityRef).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Initiated");
        builder.Property(e => e.InitiatedByUserId).IsRequired();
        builder.Property(e => e.InitiatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.CertificateGenerated).IsRequired().HasDefaultValue(false);

        builder.HasOne(e => e.InitiatedByUser)
            .WithMany()
            .HasForeignKey(e => e.InitiatedByUserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.ApprovedByUser)
            .WithMany()
            .HasForeignKey(e => e.ApprovedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
