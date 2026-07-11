namespace Rmrs.Domain.Entities;

/// <summary>
/// Generic lookup table for configurable system values.
/// </summary>
public class LookupValue
{
    public int Id { get; set; }
    public string LookupType { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
