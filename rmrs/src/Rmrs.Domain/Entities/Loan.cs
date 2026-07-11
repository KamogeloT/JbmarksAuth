namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a loan of a physical record to a user.
/// </summary>
public class Loan
{
    public int Id { get; set; }
    public int PhysicalRecordId { get; set; }
    public int BorrowerUserId { get; set; }
    public DateTime LoanDate { get; set; }
    public DateTime ExpectedReturnDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }
    public string Status { get; set; } = "Active";
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public PhysicalRecord PhysicalRecord { get; set; } = null!;
    public User BorrowerUser { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
