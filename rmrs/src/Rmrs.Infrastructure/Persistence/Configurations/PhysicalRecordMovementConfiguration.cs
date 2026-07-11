using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class PhysicalRecordMovementConfiguration : IEntityTypeConfiguration<PhysicalRecordMovement>
{
    public void Configure(EntityTypeBuilder<PhysicalRecordMovement> builder)
    {
        builder.ToTable("PhysicalRecordMovements");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.PhysicalRecordId).IsRequired();
        builder.Property(e => e.ToLocationId).IsRequired();
        builder.Property(e => e.MovedByUserId).IsRequired();
        builder.Property(e => e.MovedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(e => e.PhysicalRecord)
            .WithMany(p => p.Movements)
            .HasForeignKey(e => e.PhysicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.FromLocation)
            .WithMany()
            .HasForeignKey(e => e.FromLocationId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.ToLocation)
            .WithMany()
            .HasForeignKey(e => e.ToLocationId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.MovedByUser)
            .WithMany()
            .HasForeignKey(e => e.MovedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
