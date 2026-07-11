using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class SystemConfigurationConfiguration : IEntityTypeConfiguration<SystemConfiguration>
{
    public void Configure(EntityTypeBuilder<SystemConfiguration> builder)
    {
        builder.ToTable("SystemConfiguration");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.ConfigKey).IsRequired().HasMaxLength(100);
        builder.HasIndex(e => e.ConfigKey).IsUnique();

        builder.Property(e => e.ConfigValue).IsRequired();
        builder.Property(e => e.Description).HasMaxLength(500);
        builder.Property(e => e.UpdatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(e => e.UpdatedByUser)
            .WithMany()
            .HasForeignKey(e => e.UpdatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
