namespace Rmrs.Domain.Entities;

/// <summary>
/// Tracks the current sequence number for registry number generation per department/year.
/// </summary>
public class RegistrySequence
{
    public int Id { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public int Year { get; set; }
    public int CurrentSequence { get; set; }
}
