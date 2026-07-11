using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Orchestrates the record registration workflow: validates metadata, generates registry number,
/// assigns classification level, calculates retention expiry, and persists the record.
/// </summary>
public interface IRecordRegistrationService
{
    /// <summary>
    /// Registers a new incoming record with external reference metadata.
    /// </summary>
    Task<Record> RegisterIncomingAsync(RegisterIncomingRequest request);

    /// <summary>
    /// Registers a new outgoing record.
    /// </summary>
    Task<Record> RegisterOutgoingAsync(RegisterOutgoingRequest request);

    /// <summary>
    /// Registers a new internal record.
    /// </summary>
    Task<Record> RegisterInternalAsync(RegisterInternalRequest request);

    /// <summary>
    /// Updates an existing record's metadata.
    /// </summary>
    Task<Record> UpdateRecordAsync(int recordId, UpdateRecordRequest request);

    /// <summary>
    /// Gets a record by its ID.
    /// </summary>
    Task<Record?> GetRecordByIdAsync(int recordId);
}

/// <summary>
/// Base request model containing fields common to all record types.
/// </summary>
public abstract class RegisterRecordRequestBase
{
    /// <summary>Subject line of the record.</summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>Sender (for incoming) or recipient (for outgoing).</summary>
    public string? SenderOrRecipient { get; set; }

    /// <summary>Date the record was received or sent.</summary>
    public DateTime DateReceivedOrSent { get; set; }

    /// <summary>The file plan classification code to classify this record under.</summary>
    public string FilePlanClassificationCode { get; set; } = string.Empty;

    /// <summary>The user ID of the responsible officer.</summary>
    public int ResponsibleOfficerId { get; set; }

    /// <summary>The department code for this record.</summary>
    public string DepartmentCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional classification level override. If provided, must be >= the file plan entry's default.
    /// If null, the file plan entry's default classification level is inherited.
    /// </summary>
    public int? ClassificationLevelOverride { get; set; }
}

/// <summary>
/// Request model for registering an incoming record.
/// Includes additional fields for external correspondence.
/// </summary>
public class RegisterIncomingRequest : RegisterRecordRequestBase
{
    /// <summary>External reference number from the originating organization.</summary>
    public string? ExternalReferenceNumber { get; set; }

    /// <summary>Name of the originating organization.</summary>
    public string? OriginatingOrganization { get; set; }

    /// <summary>Date of the original correspondence.</summary>
    public DateTime? CorrespondenceDate { get; set; }
}

/// <summary>
/// Request model for registering an outgoing record.
/// </summary>
public class RegisterOutgoingRequest : RegisterRecordRequestBase
{
}

/// <summary>
/// Request model for registering an internal record.
/// </summary>
public class RegisterInternalRequest : RegisterRecordRequestBase
{
}

/// <summary>
/// Request model for updating an existing record's metadata.
/// </summary>
public class UpdateRecordRequest
{
    /// <summary>Updated subject.</summary>
    public string? Subject { get; set; }

    /// <summary>Updated sender or recipient.</summary>
    public string? SenderOrRecipient { get; set; }

    /// <summary>Updated date received or sent.</summary>
    public DateTime? DateReceivedOrSent { get; set; }

    /// <summary>Updated responsible officer ID.</summary>
    public int? ResponsibleOfficerId { get; set; }

    /// <summary>Updated classification level (must be >= current file plan default).</summary>
    public int? ClassificationLevel { get; set; }

    /// <summary>Updated status.</summary>
    public string? Status { get; set; }
}
