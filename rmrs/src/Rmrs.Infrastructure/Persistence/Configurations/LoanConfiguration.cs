using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Persistence.Configurations;

public class LoanConfiguration : IEntityTypeConfiguration<Loan>
{
    public void Configure(EntityTypeBuilder<Loan> builder)
    {
        builder.ToTable("Loans");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).UseIdentityColumn();

        builder.Property(e => e.PhysicalRecordId).IsRequired();
        builder.Property(e => e.BorrowerUserId).IsRequired();
        builder.Property(e => e.LoanDate).IsRequired();
        builder.Property(e => e.ExpectedReturnDate).IsRequired();
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20).HasDefaultValue("Active");
        builder.Property(e => e.CreatedByUserId).IsRequired();
        builder.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("GETUTCDATE()");

        // Performance indexes
        builder.HasIndex(e => e.Status).HasDatabaseName("IX_Loans_Status");
        builder.HasIndex(e => e.ExpectedReturnDate)
            .HasFilter("[ActualReturnDate] IS NULL")
            .HasDatabaseName("IX_Loans_ExpectedReturnDate");

        builder.HasOne(e => e.PhysicalRecord)
            .WithMany(p => p.Loans)
            .HasForeignKey(e => e.PhysicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.BorrowerUser)
            .WithMany()
            .HasForeignKey(e => e.BorrowerUserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(e => e.CreatedByUser)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
