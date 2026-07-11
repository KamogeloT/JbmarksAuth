namespace Rmrs.Application.Models.Bitrix;

/// <summary>
/// Represents a Bitrix workgroup (social network group) retrieved via sonet_group.get API.
/// </summary>
public sealed record BitrixWorkgroup
{
    /// <summary>
    /// The unique workgroup identifier.
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// The display name of the workgroup.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// The workgroup description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Whether the workgroup is currently active.
    /// </summary>
    public bool IsActive { get; init; }

    /// <summary>
    /// The owner user ID of the workgroup.
    /// </summary>
    public int OwnerId { get; init; }
}
