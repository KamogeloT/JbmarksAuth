namespace Rmrs.Application.Interfaces;

/// <summary>
/// Manages folder structures in Bitrix workgroup drives that mirror the file plan hierarchy.
/// Ensures that the correct folder path exists before documents are uploaded.
/// </summary>
public interface IBitrixFolderService
{
    /// <summary>
    /// Ensures the folder structure in the Bitrix workgroup drive mirrors the file plan
    /// classification path for the specified department. Creates any missing folders.
    /// </summary>
    /// <param name="departmentCode">The department code used to look up the workgroup drive.</param>
    /// <param name="classificationPath">
    /// The file plan classification path (e.g., "Finance/Accounts Payable/Invoices").
    /// Each segment represents a folder level in the hierarchy.
    /// </param>
    /// <returns>The Bitrix folder ID of the leaf (deepest) folder in the path.</returns>
    Task<int> EnsureFolderStructureAsync(string departmentCode, string classificationPath);

    /// <summary>
    /// Gets or creates a single folder within a Bitrix drive at the specified parent.
    /// </summary>
    /// <param name="parentFolderId">The parent folder ID in Bitrix drive.</param>
    /// <param name="folderName">The folder name to get or create.</param>
    /// <returns>The Bitrix folder ID (existing or newly created).</returns>
    Task<int> GetOrCreateFolderAsync(int parentFolderId, string folderName);
}
