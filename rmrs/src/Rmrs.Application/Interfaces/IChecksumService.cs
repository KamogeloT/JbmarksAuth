namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for computing and verifying SHA-256 checksums for document integrity.
/// Compares stored checksums against current Bitrix file content to detect tampering.
/// </summary>
public interface IChecksumService
{
    /// <summary>
    /// Computes the SHA-256 checksum of the provided file stream.
    /// </summary>
    /// <param name="fileStream">The file content stream.</param>
    /// <returns>The hexadecimal SHA-256 checksum string (lowercase).</returns>
    string ComputeSha256(Stream fileStream);

    /// <summary>
    /// Verifies the integrity of a document by downloading it from Bitrix,
    /// computing its SHA-256 checksum, and comparing against the stored checksum.
    /// </summary>
    /// <param name="documentId">The document ID to verify.</param>
    /// <returns>True if the checksum matches, false if a mismatch is detected.</returns>
    Task<bool> VerifyAsync(int documentId);
}
