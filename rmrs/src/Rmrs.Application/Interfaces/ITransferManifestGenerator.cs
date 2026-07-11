using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Interface for generating archive transfer manifest PDFs.
/// Separated for testability and single-responsibility.
/// The manifest includes: batch number, transfer date, destination archive,
/// list of records with metadata, and total record count.
/// Implements Requirement 8.3.
/// </summary>
public interface ITransferManifestGenerator
{
    /// <summary>
    /// Generates a PDF manifest for the given transfer batch.
    /// </summary>
    /// <param name="batch">The transfer batch entity with loaded records.</param>
    /// <returns>The PDF content as a byte array.</returns>
    byte[] GenerateManifest(TransferBatch batch);
}
