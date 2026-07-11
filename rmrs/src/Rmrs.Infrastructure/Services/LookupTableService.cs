using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages lookup tables for configurable system values (record types, classification levels,
/// storage locations, departments, disposal authority references).
/// Implements Requirements 13.2.
/// </summary>
public class LookupTableService : ILookupTableService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<LookupTableService> _logger;

    /// <summary>
    /// The set of valid lookup types supported by the system.
    /// </summary>
    private static readonly HashSet<string> _validLookupTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "RecordType",
        "ClassificationLevel",
        "StorageLocation",
        "Department",
        "DisposalAuthority"
    };

    public LookupTableService(RmrsDbContext dbContext, ILogger<LookupTableService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public IEnumerable<string> GetValidLookupTypes() => _validLookupTypes;

    /// <inheritdoc />
    public async Task<IEnumerable<LookupValueDto>> GetByTypeAsync(string lookupType)
    {
        ValidateLookupType(lookupType);

        var values = await _dbContext.LookupValues
            .Where(lv => lv.LookupType == lookupType)
            .OrderBy(lv => lv.SortOrder)
            .ThenBy(lv => lv.DisplayName)
            .ToListAsync();

        return values.Select(MapToDto);
    }

    /// <inheritdoc />
    public async Task<LookupValueDto?> GetByTypeAndCodeAsync(string lookupType, string code)
    {
        ValidateLookupType(lookupType);

        var value = await _dbContext.LookupValues
            .FirstOrDefaultAsync(lv => lv.LookupType == lookupType && lv.Code == code);

        return value != null ? MapToDto(value) : null;
    }

    /// <inheritdoc />
    public async Task<LookupValueDto> CreateAsync(CreateLookupValueRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateLookupType(request.LookupType);

        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("Code is required.", nameof(request));
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ArgumentException("DisplayName is required.", nameof(request));

        // Check for duplicate
        var existing = await _dbContext.LookupValues
            .FirstOrDefaultAsync(lv => lv.LookupType == request.LookupType && lv.Code == request.Code);

        if (existing != null)
            throw new InvalidOperationException(
                $"Lookup value with type '{request.LookupType}' and code '{request.Code}' already exists.");

        var lookupValue = new LookupValue
        {
            LookupType = request.LookupType,
            Code = request.Code,
            DisplayName = request.DisplayName,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive
        };

        _dbContext.LookupValues.Add(lookupValue);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Created lookup value: Type={Type}, Code={Code}, DisplayName={DisplayName}",
            request.LookupType, request.Code, request.DisplayName);

        return MapToDto(lookupValue);
    }

    /// <inheritdoc />
    public async Task<LookupValueDto> UpdateAsync(string lookupType, string code, UpdateLookupValueRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateLookupType(lookupType);

        var lookupValue = await _dbContext.LookupValues
            .FirstOrDefaultAsync(lv => lv.LookupType == lookupType && lv.Code == code);

        if (lookupValue == null)
            throw new KeyNotFoundException(
                $"Lookup value with type '{lookupType}' and code '{code}' not found.");

        // Apply updates
        if (request.DisplayName != null)
            lookupValue.DisplayName = request.DisplayName;
        if (request.SortOrder.HasValue)
            lookupValue.SortOrder = request.SortOrder.Value;
        if (request.IsActive.HasValue)
            lookupValue.IsActive = request.IsActive.Value;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Updated lookup value: Type={Type}, Code={Code}",
            lookupType, code);

        return MapToDto(lookupValue);
    }

    private void ValidateLookupType(string lookupType)
    {
        if (string.IsNullOrWhiteSpace(lookupType))
            throw new ArgumentException("Lookup type is required.", nameof(lookupType));

        if (!_validLookupTypes.Contains(lookupType))
            throw new ArgumentException(
                $"Invalid lookup type '{lookupType}'. Valid types are: {string.Join(", ", _validLookupTypes)}.",
                nameof(lookupType));
    }

    private static LookupValueDto MapToDto(LookupValue entity) => new()
    {
        Id = entity.Id,
        LookupType = entity.LookupType,
        Code = entity.Code,
        DisplayName = entity.DisplayName,
        SortOrder = entity.SortOrder,
        IsActive = entity.IsActive
    };
}
