using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class RegistrySequenceConfiguration : IEntityTypeConfiguration<RegistrySequence>
{
    public void Configure(EntityTypeBuilder<RegistrySequence> builder)
    {
        builder.ToTable("RegistrySequences");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.DepartmentCode).IsRequired().HasMaxLength(20);
        builder.Property(e => e.Year).IsRequired();
        builder.Property(e => e.CurrentSequence).IsRequired().HasDefaultValue(0);

        builder.HasIndex(e => new { e.DepartmentCode, e.Year })
            .IsUnique()
            .HasDatabaseName("UQ_RegistrySequences");
    }
}
