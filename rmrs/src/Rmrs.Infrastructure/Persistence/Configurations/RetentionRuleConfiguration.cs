using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class RetentionRuleConfiguration : IEntityTypeConfiguration<RetentionRule>
{
    public void Configure(EntityTypeBuilder<RetentionRule> builder)
    {
        builder.ToTable("RetentionRules");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.RuleName).IsRequired().HasMaxLength(256);
        builder.Property(e => e.RetentionYears).IsRequired();
        builder.Property(e => e.RetentionMonths).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.DisposalAction).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Description).HasMaxLength(1000);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
    }
}
