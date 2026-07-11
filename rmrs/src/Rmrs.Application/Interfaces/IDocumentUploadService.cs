using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Orchestrates document upload, versioning, and download operations.
/// Coordinates validation, SHA-256 checksum computation, Bitrix folder structure creation,
/// file upload to Bitrix workgroup drives, and metadata persistence.
/// </summary>
public interface IDocumentUploadService
{
    /// <summary>
    /// Uploads a new document for the specified record.
    /// Validates file size (max 100MB), computes SHA-256 checksum, ensures the
    /// folder structure exists in Bitrix, uploads the file, and stores metadata.
    /// </summary>
    /// <param name="recordId">The record to attach the document to.</param>
    /// <param name="fileStream">The file content stream.</param>
    /// <param name="fileName">The original file name.</param>
    /// <param name="mimeType">The MIME type of the file.</param>
    /// <param name="userId">The uploading user's ID.</param>
    /// <returns>The created document version with metadata.</returns>
    Task<DocumentVersion> UploadAsync(int recordId, Stream fileStream, string fileName, string mimeType, int userId);

    /// <summary>
    /// Uploads a new version of an existing document.
    /// Creates version N+1 with a new SHA-256 checksum, uploads to Bitrix,
    /// and records the version metadata.
    /// </summary>
    /// <param name="documentId">The existing document's ID.</param>
    /// <param name="fileStream">The new version's file content stream.</param>
    /// <param name="fileName">The file name for the new version.</param>
    /// <param name="mimeType">The MIME type of the file.</param>
    /// <param name="userId">The uploading user's ID.</param>
    /// <returns>The created document version with metadata.</returns>
    Task<DocumentVersion> UploadNewVersionAsync(int documentId, Stream fileStream, string fileName, string mimeType, int userId);

    /// <summary>
    /// Downloads a document from Bitrix by its document ID.
    /// </summary>
    /// <param name="documentId">The document ID to download.</param>
    /// <returns>A stream containing the file content.</returns>
    Task<Stream> DownloadAsync(int documentId);
}
