using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class PhysicalRecordConfiguration : IEntityTypeConfiguration<PhysicalRecord>
{
    public void Configure(EntityTypeBuilder<PhysicalRecord> builder)
    {
        builder.ToTable("PhysicalRecords");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.RecordId).IsRequired();
        builder.Property(e => e.BarcodeValue).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.BarcodeValue).IsUnique();

        builder.Property(e => e.QrCodeValue).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20).HasDefaultValue("InStorage");
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(e => e.Record)
            .WithOne(r => r.PhysicalRecord)
            .HasForeignKey<PhysicalRecord>(e => e.RecordId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.CurrentLocation)
            .WithMany()
            .HasForeignKey(e => e.CurrentLocationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
