using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Orchestrates the record registration workflow:
/// 1. Validates required metadata
/// 2. Resolves department and file plan entry
/// 3. Generates a unique registry number
/// 4. Assigns classification level (inherited or overridden upward)
/// 5. Calculates retention expiry date
/// 6. Persists the record
/// </summary>
public class RecordRegistrationService : IRecordRegistrationService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IRegistryNumberGenerator _registryNumberGenerator;
    private readonly ILogger<RecordRegistrationService> _logger;

    public RecordRegistrationService(
        RmrsDbContext dbContext,
        IRegistryNumberGenerator registryNumberGenerator,
        ILogger<RecordRegistrationService> logger)
    {
        _dbContext = dbContext;
        _registryNumberGenerator = registryNumberGenerator;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<Record> RegisterIncomingAsync(RegisterIncomingRequest request)
    {
        ValidateBaseRequest(request);

        var (department, filePlanEntry) = await ResolveEntitiesAsync(request.DepartmentCode, request.FilePlanClassificationCode);
        var classificationLevel = ResolveClassificationLevel(filePlanEntry, request.ClassificationLevelOverride);
        var registryNumber = await _registryNumberGenerator.GenerateNextAsync(department.DepartmentCode);
        var retentionExpiryDate = CalculateRetentionExpiry(filePlanEntry.RetentionRule, DateTime.UtcNow);

        var record = new Record
        {
            RegistryNumber = registryNumber,
            RecordType = "Incoming",
            Subject = request.Subject,
            SenderOrRecipient = request.SenderOrRecipient,
            DateReceivedOrSent = request.DateReceivedOrSent,
            FilePlanEntryId = filePlanEntry.Id,
            ClassificationLevel = classificationLevel,
            ResponsibleOfficerId = request.ResponsibleOfficerId,
            DepartmentId = department.Id,
            ExternalReferenceNumber = request.ExternalReferenceNumber,
            OriginatingOrganization = request.OriginatingOrganization,
            CorrespondenceDate = request.CorrespondenceDate,
            Status = "Active",
            RetentionExpiryDate = retentionExpiryDate,
            CreatedByUserId = request.ResponsibleOfficerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Records.Add(record);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Registered incoming record {RegistryNumber} for department {DepartmentCode}",
            registryNumber, department.DepartmentCode);

        return record;
    }

    /// <inheritdoc />
    public async Task<Record> RegisterOutgoingAsync(RegisterOutgoingRequest request)
    {
        ValidateBaseRequest(request);

        var (department, filePlanEntry) = await ResolveEntitiesAsync(request.DepartmentCode, request.FilePlanClassificationCode);
        var classificationLevel = ResolveClassificationLevel(filePlanEntry, request.ClassificationLevelOverride);
        var registryNumber = await _registryNumberGenerator.GenerateNextAsync(department.DepartmentCode);
        var retentionExpiryDate = CalculateRetentionExpiry(filePlanEntry.RetentionRule, DateTime.UtcNow);

        var record = new Record
        {
            RegistryNumber = registryNumber,
            RecordType = "Outgoing",
            Subject = request.Subject,
            SenderOrRecipient = request.SenderOrRecipient,
            DateReceivedOrSent = request.DateReceivedOrSent,
            FilePlanEntryId = filePlanEntry.Id,
            ClassificationLevel = classificationLevel,
            ResponsibleOfficerId = request.ResponsibleOfficerId,
            DepartmentId = department.Id,
            Status = "Active",
            RetentionExpiryDate = retentionExpiryDate,
            CreatedByUserId = request.ResponsibleOfficerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Records.Add(record);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Registered outgoing record {RegistryNumber} for department {DepartmentCode}",
            registryNumber, department.DepartmentCode);

        return record;
    }

    /// <inheritdoc />
    public async Task<Record> RegisterInternalAsync(RegisterInternalRequest request)
    {
        ValidateBaseRequest(request);

        var (department, filePlanEntry) = await ResolveEntitiesAsync(request.DepartmentCode, request.FilePlanClassificationCode);
        var classificationLevel = ResolveClassificationLevel(filePlanEntry, request.ClassificationLevelOverride);
        var registryNumber = await _registryNumberGenerator.GenerateNextAsync(department.DepartmentCode);
        var retentionExpiryDate = CalculateRetentionExpiry(filePlanEntry.RetentionRule, DateTime.UtcNow);

        var record = new Record
        {
            RegistryNumber = registryNumber,
            RecordType = "Internal",
            Subject = request.Subject,
            SenderOrRecipient = request.SenderOrRecipient,
            DateReceivedOrSent = request.DateReceivedOrSent,
            FilePlanEntryId = filePlanEntry.Id,
            ClassificationLevel = classificationLevel,
            ResponsibleOfficerId = request.ResponsibleOfficerId,
            DepartmentId = department.Id,
            Status = "Active",
            RetentionExpiryDate = retentionExpiryDate,
            CreatedByUserId = request.ResponsibleOfficerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Records.Add(record);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Registered internal record {RegistryNumber} for department {DepartmentCode}",
            registryNumber, department.DepartmentCode);

        return record;
    }

    /// <inheritdoc />
    public async Task<Record> UpdateRecordAsync(int recordId, UpdateRecordRequest request)
    {
        var record = await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .FirstOrDefaultAsync(r => r.Id == recordId);

        if (record == null)
            throw new NotFoundException("Record", recordId);

        if (request.Subject != null)
            record.Subject = request.Subject;

        if (request.SenderOrRecipient != null)
            record.SenderOrRecipient = request.SenderOrRecipient;

        if (request.DateReceivedOrSent.HasValue)
            record.DateReceivedOrSent = request.DateReceivedOrSent.Value;

        if (request.ResponsibleOfficerId.HasValue)
            record.ResponsibleOfficerId = request.ResponsibleOfficerId.Value;

        if (request.ClassificationLevel.HasValue)
        {
            // Classification level can only be overridden upward (never downward)
            if (request.ClassificationLevel.Value < record.FilePlanEntry.DefaultClassificationLevel)
            {
                throw new ValidationException(
                    "Classification level cannot be set below the file plan entry's default level.",
                    $"Minimum allowed level is {record.FilePlanEntry.DefaultClassificationLevel}.");
            }
            record.ClassificationLevel = request.ClassificationLevel.Value;
        }

        if (request.Status != null)
            record.Status = request.Status;

        record.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Updated record {RecordId} ({RegistryNumber})", recordId, record.RegistryNumber);

        return record;
    }

    /// <inheritdoc />
    public async Task<Record?> GetRecordByIdAsync(int recordId)
    {
        return await _dbContext.Records
            .Include(r => r.FilePlanEntry)
            .Include(r => r.Department)
            .Include(r => r.ResponsibleOfficer)
            .Include(r => r.CreatedByUser)
            .FirstOrDefaultAsync(r => r.Id == recordId);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ────────────────────────────────────────────────────────────────────────

    private static void ValidateBaseRequest(RegisterRecordRequestBase request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Subject))
            errors.Add("Subject is required.");

        if (request.DateReceivedOrSent == default)
            errors.Add("Date received or sent is required.");

        if (string.IsNullOrWhiteSpace(request.FilePlanClassificationCode))
            errors.Add("File plan classification code is required.");

        if (request.ResponsibleOfficerId <= 0)
            errors.Add("Responsible officer ID is required.");

        if (string.IsNullOrWhiteSpace(request.DepartmentCode))
            errors.Add("Department code is required.");

        if (errors.Count > 0)
        {
            throw new ValidationException(
                "Record registration validation failed.",
                string.Join(" ", errors));
        }
    }

    private async Task<(Department department, FilePlanEntry filePlanEntry)> ResolveEntitiesAsync(
        string departmentCode, string classificationCode)
    {
        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.DepartmentCode == departmentCode && d.IsActive);

        if (department == null)
            throw new ValidationException(
                $"Department with code '{departmentCode}' was not found or is inactive.");

        var filePlanEntry = await _dbContext.FilePlanEntries
            .Include(f => f.RetentionRule)
            .FirstOrDefaultAsync(f => f.ClassificationCode == classificationCode);

        if (filePlanEntry == null)
            throw new ValidationException(
                $"File plan entry with classification code '{classificationCode}' was not found.");

        if (!filePlanEntry.IsActive)
            throw new ValidationException(
                $"File plan entry '{classificationCode}' is deactivated and cannot accept new records.");

        return (department, filePlanEntry);
    }

    private static int ResolveClassificationLevel(FilePlanEntry filePlanEntry, int? overrideLevel)
    {
        var defaultLevel = filePlanEntry.DefaultClassificationLevel;

        if (overrideLevel == null)
            return defaultLevel;

        // Classification level can only be overridden upward, never downward
        if (overrideLevel.Value < defaultLevel)
        {
            throw new ValidationException(
                "Classification level override must be greater than or equal to the file plan entry's default level.",
                $"File plan default is {defaultLevel}, but {overrideLevel.Value} was provided.");
        }

        return overrideLevel.Value;
    }

    private static DateTime? CalculateRetentionExpiry(RetentionRule? retentionRule, DateTime creationDate)
    {
        if (retentionRule == null)
            return null;

        return creationDate
            .AddYears(retentionRule.RetentionYears)
            .AddMonths(retentionRule.RetentionMonths);
    }
}
