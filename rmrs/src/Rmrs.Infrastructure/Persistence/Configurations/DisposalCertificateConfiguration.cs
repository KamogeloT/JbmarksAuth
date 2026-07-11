using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DisposalCertificateConfiguration : IEntityTypeConfiguration<DisposalCertificate>
{
    public void Configure(EntityTypeBuilder<DisposalCertificate> builder)
    {
        builder.ToTable("DisposalCertificates");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.DisposalBatchId).IsRequired();
        builder.Property(e => e.CertificateNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.CertificateNumber).IsUnique();

        builder.Property(e => e.GeneratedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.CertificateData).IsRequired();

        builder.HasOne(e => e.DisposalBatch)
            .WithOne(b => b.Certificate)
            .HasForeignKey<DisposalCertificate>(e => e.DisposalBatchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
