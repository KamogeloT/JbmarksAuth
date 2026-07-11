namespace Rmrs.Application.Models.Bitrix;

/// <summary>
/// Represents file information returned from Bitrix Drive API operations.
/// </summary>
public sealed record BitrixFileInfo
{
    /// <summary>
    /// The unique Bitrix file identifier.
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// The file name.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// The file size in bytes.
    /// </summary>
    public long Size { get; init; }

    /// <summary>
    /// The MIME content type of the file.
    /// </summary>
    public string ContentType { get; init; } = string.Empty;

    /// <summary>
    /// The download URL for the file.
    /// </summary>
    public string? DownloadUrl { get; init; }

    /// <summary>
    /// The parent folder ID in Bitrix drive.
    /// </summary>
    public int FolderId { get; init; }

    /// <summary>
    /// The date and time the file was created on Bitrix.
    /// </summary>
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// The date and time the file was last modified on Bitrix.
    /// </summary>
    public DateTime UpdatedAt { get; init; }
}
