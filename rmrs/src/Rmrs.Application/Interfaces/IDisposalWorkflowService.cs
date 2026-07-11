using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing the full disposal workflow:
/// candidate identification, batch creation, approval, execution, and certificate generation.
/// Implements Requirements 7.1 - 7.7.
/// </summary>
public interface IDisposalWorkflowService
{
    /// <summary>
    /// Retrieves all records that are past their retention expiry date and eligible for disposal.
    /// Disposal certificates and audit logs are never included as candidates (Requirement 7.7).
    /// </summary>
    /// <returns>A collection of records eligible for disposal.</returns>
    Task<IEnumerable<Record>> GetDisposalCandidatesAsync();

    /// <summary>
    /// Creates a new disposal batch initiated by a Records_Manager.
    /// </summary>
    /// <param name="request">The batch initiation request with record IDs and disposal authority.</param>
    /// <param name="initiatedByUserId">The user ID of the Records_Manager initiating the batch.</param>
    /// <returns>The newly created disposal batch.</returns>
    Task<DisposalBatch> InitiateDisposalAsync(InitiateDisposalRequest request, int initiatedByUserId);

    /// <summary>
    /// Approves a disposal batch. Requires Compliance_Officer role and re-authentication.
    /// </summary>
    /// <param name="batchId">The ID of the batch to approve.</param>
    /// <param name="complianceOfficerId">The user ID of the Compliance_Officer approving.</param>
    /// <returns>The updated disposal batch with approval details.</returns>
    Task<DisposalBatch> ApproveDisposalAsync(int batchId, int complianceOfficerId);

    /// <summary>
    /// Executes an approved disposal batch:
    /// - Deletes files from Bitrix via REST API
    /// - Removes file references from RMRS database
    /// - Retains metadata and disposal certificate
    /// - If Bitrix deletion fails, marks record as "disposal pending"
    /// </summary>
    /// <param name="batchId">The ID of the approved batch to execute.</param>
    Task ExecuteDisposalAsync(int batchId);

    /// <summary>
    /// Generates a disposal certificate PDF for an executed batch.
    /// Certificate contains: record list, authority reference, approver name, disposal date.
    /// </summary>
    /// <param name="batchId">The ID of the executed batch.</param>
    /// <returns>The PDF certificate data as byte array.</returns>
    Task<byte[]> GenerateDisposalCertificateAsync(int batchId);

    /// <summary>
    /// Retrieves the disposal certificate for a given batch.
    /// </summary>
    /// <param name="batchId">The ID of the batch.</param>
    /// <returns>The disposal certificate entity, or null if not generated.</returns>
    Task<DisposalCertificate?> GetCertificateAsync(int batchId);

    /// <summary>
    /// Retrieves a disposal batch by its ID.
    /// </summary>
    /// <param name="batchId">The batch ID.</param>
    /// <returns>The disposal batch, or null if not found.</returns>
    Task<DisposalBatch?> GetBatchAsync(int batchId);
}

/// <summary>
/// Request model for initiating a disposal batch.
/// </summary>
public class InitiateDisposalRequest
{
    /// <summary>
    /// The IDs of records to include in the disposal batch.
    /// </summary>
    public List<int> RecordIds { get; set; } = new();

    /// <summary>
    /// Reference to the approved Disposal Authority permitting destruction.
    /// </summary>
    public string DisposalAuthorityRef { get; set; } = string.Empty;
}
