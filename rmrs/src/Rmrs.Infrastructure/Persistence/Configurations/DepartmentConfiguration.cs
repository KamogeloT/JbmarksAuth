using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.DepartmentCode).IsRequired().HasMaxLength(20);
        builder.HasIndex(e => e.DepartmentCode).IsUnique();

        builder.Property(e => e.DepartmentName).IsRequired().HasMaxLength(256);

        builder.Property(e => e.BitrixWorkgroupId).IsRequired();
        builder.HasIndex(e => e.BitrixWorkgroupId).IsUnique();

        builder.Property(e => e.BitrixDriveId).IsRequired();
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.UpdatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
    }
}
