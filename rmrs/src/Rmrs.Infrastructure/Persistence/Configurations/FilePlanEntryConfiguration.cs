using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class FilePlanEntryConfiguration : IEntityTypeConfiguration<FilePlanEntry>
{
    public void Configure(EntityTypeBuilder<FilePlanEntry> builder)
    {
        builder.ToTable("FilePlanEntries");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.ClassificationCode).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.ClassificationCode).IsUnique();

        builder.Property(e => e.Title).IsRequired().HasMaxLength(256);
        builder.Property(e => e.Description).HasMaxLength(2000);
        builder.Property(e => e.Level).IsRequired();
        builder.Property(e => e.RetentionRuleId).IsRequired();
        builder.Property(e => e.DisposalAuthorityRef).IsRequired().HasMaxLength(100);
        builder.Property(e => e.DefaultClassificationLevel).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(e => e.UpdatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        // Check constraint for Level (1-5)
        builder.ToTable(t => t.HasCheckConstraint("CK_FilePlanEntries_Level", "[Level] BETWEEN 1 AND 5"));

        // Self-referencing hierarchy
        builder.HasOne(e => e.Parent)
            .WithMany(e => e.Children)
            .HasForeignKey(e => e.ParentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.RetentionRule)
            .WithMany(r => r.FilePlanEntries)
            .HasForeignKey(e => e.RetentionRuleId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
