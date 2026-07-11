namespace Rmrs.Domain.Entities;

/// <summary>
/// Represents a physical record with barcode/QR tracking and location.
/// </summary>
public class PhysicalRecord
{
    public int Id { get; set; }
    public int RecordId { get; set; }
    public string BarcodeValue { get; set; } = string.Empty;
    public string QrCodeValue { get; set; } = string.Empty;
    public int? CurrentLocationId { get; set; }
    public string Status { get; set; } = "InStorage";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Record Record { get; set; } = null!;
    public StorageLocation? CurrentLocation { get; set; }
    public ICollection<PhysicalRecordMovement> Movements { get; set; } = new List<PhysicalRecordMovement>();
    public ICollection<Loan> Loans { get; set; } = new List<Loan>();
}
