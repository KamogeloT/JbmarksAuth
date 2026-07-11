using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class StorageLocationConfiguration : IEntityTypeConfiguration<StorageLocation>
{
    public void Configure(EntityTypeBuilder<StorageLocation> builder)
    {
        builder.ToTable("StorageLocations");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.LocationType).IsRequired().HasMaxLength(20);
        builder.ToTable(t => t.HasCheckConstraint("CK_StorageLocations_LocationType",
            "[LocationType] IN ('Building', 'Floor', 'Room', 'Shelf', 'Position')"));

        builder.Property(e => e.LocationName).IsRequired().HasMaxLength(100);
        builder.Property(e => e.LocationCode).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.LocationCode).IsUnique();

        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        // Self-referencing hierarchy
        builder.HasOne(e => e.Parent)
            .WithMany(e => e.Children)
            .HasForeignKey(e => e.ParentId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
