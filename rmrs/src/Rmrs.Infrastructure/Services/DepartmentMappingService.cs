using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Business logic for managing department-to-Bitrix workgroup drive mappings.
/// All mappings are stored in the database and fully configurable at runtime
/// through the admin UI — nothing is hardcoded. Admins can add, change, or remove
/// workgroup mappings at any time without code changes or deployments.
/// </summary>
public class DepartmentMappingService : IDepartmentMappingService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IBitrixApiClient _bitrixApiClient;
    private readonly ITokenService _tokenService;
    private readonly IUserContext _userContext;
    private readonly ILogger<DepartmentMappingService> _logger;

    public DepartmentMappingService(
        RmrsDbContext dbContext,
        IBitrixApiClient bitrixApiClient,
        ITokenService tokenService,
        IUserContext userContext,
        ILogger<DepartmentMappingService> logger)
    {
        _dbContext = dbContext;
        _bitrixApiClient = bitrixApiClient;
        _tokenService = tokenService;
        _userContext = userContext;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<Department> CreateMappingAsync(
        string departmentCode,
        string departmentName,
        int bitrixWorkgroupId,
        int bitrixDriveId)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(departmentCode))
            throw new ValidationException("Department code is required.");

        if (string.IsNullOrWhiteSpace(departmentName))
            throw new ValidationException("Department name is required.");

        if (bitrixWorkgroupId <= 0)
            throw new ValidationException("Bitrix workgroup ID must be a positive integer.");

        if (bitrixDriveId <= 0)
            throw new ValidationException("Bitrix drive ID must be a positive integer.");

        // Check for duplicate department code
        var existingByCode = await _dbContext.Departments
            .AnyAsync(d => d.DepartmentCode == departmentCode);
        if (existingByCode)
            throw new ConflictException(
                $"A department mapping with code '{departmentCode}' already exists.");

        // Check for duplicate Bitrix workgroup ID (enforce one-to-one)
        var existingByWorkgroup = await _dbContext.Departments
            .AnyAsync(d => d.BitrixWorkgroupId == bitrixWorkgroupId);
        if (existingByWorkgroup)
            throw new ConflictException(
                $"A department mapping with Bitrix workgroup ID '{bitrixWorkgroupId}' already exists. Each workgroup can only be mapped to one department.");

        // Validate workgroup exists on Bitrix platform
        var workgroupExists = await ValidateWorkgroupAsync(bitrixWorkgroupId);
        if (!workgroupExists)
            throw new ValidationException(
                $"Bitrix workgroup with ID '{bitrixWorkgroupId}' does not exist or is not accessible.");

        // Create the department mapping
        var department = new Department
        {
            DepartmentCode = departmentCode.Trim(),
            DepartmentName = departmentName.Trim(),
            BitrixWorkgroupId = bitrixWorkgroupId,
            BitrixDriveId = bitrixDriveId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Departments.Add(department);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Department mapping created: {DepartmentCode} -> Workgroup {WorkgroupId} by user {UserId}",
            department.DepartmentCode, department.BitrixWorkgroupId, _userContext.UserId);

        return department;
    }

    /// <inheritdoc/>
    public async Task<Department> UpdateMappingAsync(
        int id,
        string departmentName,
        int bitrixWorkgroupId,
        int bitrixDriveId)
    {
        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            throw new NotFoundException("Department", id);

        if (string.IsNullOrWhiteSpace(departmentName))
            throw new ValidationException("Department name is required.");

        if (bitrixWorkgroupId <= 0)
            throw new ValidationException("Bitrix workgroup ID must be a positive integer.");

        if (bitrixDriveId <= 0)
            throw new ValidationException("Bitrix drive ID must be a positive integer.");

        // If workgroup ID is changing, validate uniqueness and existence
        if (department.BitrixWorkgroupId != bitrixWorkgroupId)
        {
            var existingByWorkgroup = await _dbContext.Departments
                .AnyAsync(d => d.BitrixWorkgroupId == bitrixWorkgroupId && d.Id != id);
            if (existingByWorkgroup)
                throw new ConflictException(
                    $"A department mapping with Bitrix workgroup ID '{bitrixWorkgroupId}' already exists. Each workgroup can only be mapped to one department.");

            // Validate the new workgroup exists on Bitrix
            var workgroupExists = await ValidateWorkgroupAsync(bitrixWorkgroupId);
            if (!workgroupExists)
                throw new ValidationException(
                    $"Bitrix workgroup with ID '{bitrixWorkgroupId}' does not exist or is not accessible.");
        }

        // Apply updates
        department.DepartmentName = departmentName.Trim();
        department.BitrixWorkgroupId = bitrixWorkgroupId;
        department.BitrixDriveId = bitrixDriveId;
        department.UpdatedAt = DateTime.UtcNow;

        _dbContext.Departments.Update(department);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Department mapping updated: {DepartmentCode} (ID {Id}) by user {UserId}",
            department.DepartmentCode, department.Id, _userContext.UserId);

        return department;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteMappingAsync(int id)
    {
        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            throw new NotFoundException("Department", id);

        // Check for associated records — block deletion if any exist
        var hasRecords = await _dbContext.Records
            .AnyAsync(r => r.DepartmentId == id);

        if (hasRecords)
            throw new ConflictException(
                "Cannot delete this department mapping because it has associated records. " +
                "Please reassign or remove all records before deleting the mapping.");

        _dbContext.Departments.Remove(department);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Department mapping deleted: {DepartmentCode} (ID {Id}) by user {UserId}",
            department.DepartmentCode, department.Id, _userContext.UserId);

        return true;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Department>> GetAllMappingsAsync()
    {
        return await _dbContext.Departments
            .AsNoTracking()
            .OrderBy(d => d.DepartmentName)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<Department?> GetMappingByIdAsync(int id)
    {
        return await _dbContext.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id);
    }

    /// <inheritdoc/>
    public async Task<Department?> GetMappingByDepartmentCodeAsync(string departmentCode)
    {
        if (string.IsNullOrWhiteSpace(departmentCode))
            return null;

        return await _dbContext.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DepartmentCode == departmentCode);
    }

    /// <inheritdoc/>
    public async Task<bool> ValidateWorkgroupAsync(int workgroupId)
    {
        try
        {
            var accessToken = await _tokenService.GetValidAccessTokenAsync(_userContext.UserId);
            return await _bitrixApiClient.ValidateWorkgroupExistsAsync(workgroupId, accessToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to validate Bitrix workgroup {WorkgroupId}. Bitrix API may be unavailable.",
                workgroupId);
            throw new BitrixApiException(
                $"Unable to validate workgroup {workgroupId}. The Bitrix platform may be unavailable.",
                ex.Message, ex);
        }
    }
}
