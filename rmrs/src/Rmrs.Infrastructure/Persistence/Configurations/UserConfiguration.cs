using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.BitrixUserId).IsRequired();
        builder.HasIndex(e => e.BitrixUserId).IsUnique();

        builder.Property(e => e.Email).IsRequired().HasMaxLength(256);
        builder.Property(e => e.FullName).IsRequired().HasMaxLength(256);
        builder.Property(e => e.DepartmentCode).HasMaxLength(20);
        builder.Property(e => e.MaxClassificationLevel).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.UpdatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
    }
}
