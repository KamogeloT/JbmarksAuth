using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages storage location hierarchy and physical record movement operations.
/// Supports building/floor/room/shelf/position hierarchy levels.
/// </summary>
public class LocationService : ILocationService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<LocationService> _logger;

    private static readonly HashSet<string> ValidLocationTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Building", "Floor", "Room", "Shelf", "Position"
    };

    public LocationService(RmrsDbContext dbContext, ILogger<LocationService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<StorageLocation?> GetCurrentLocationAsync(int physicalRecordId)
    {
        var physicalRecord = await _dbContext.PhysicalRecords
            .Include(pr => pr.CurrentLocation)
            .FirstOrDefaultAsync(pr => pr.Id == physicalRecordId);

        if (physicalRecord == null)
            throw new NotFoundException("PhysicalRecord", physicalRecordId);

        return physicalRecord.CurrentLocation;
    }

    /// <inheritdoc />
    public async Task MoveRecordAsync(int physicalRecordId, int newLocationId, int userId)
    {
        var physicalRecord = await _dbContext.PhysicalRecords
            .FirstOrDefaultAsync(pr => pr.Id == physicalRecordId);

        if (physicalRecord == null)
            throw new NotFoundException("PhysicalRecord", physicalRecordId);

        var newLocation = await _dbContext.StorageLocations
            .FirstOrDefaultAsync(sl => sl.Id == newLocationId && sl.IsActive);

        if (newLocation == null)
            throw new NotFoundException("StorageLocation", newLocationId);

        var previousLocationId = physicalRecord.CurrentLocationId;

        // Record the movement
        var movement = new PhysicalRecordMovement
        {
            PhysicalRecordId = physicalRecordId,
            FromLocationId = previousLocationId,
            ToLocationId = newLocationId,
            MovedByUserId = userId,
            MovedAt = DateTime.UtcNow
        };

        _dbContext.PhysicalRecordMovements.Add(movement);

        // Update current location on the physical record
        physicalRecord.CurrentLocationId = newLocationId;
        physicalRecord.Status = "InStorage";

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Physical record {PhysicalRecordId} moved from location {FromLocationId} to {ToLocationId} by user {UserId}",
            physicalRecordId, previousLocationId, newLocationId, userId);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<PhysicalRecordMovement>> GetMovementHistoryAsync(int physicalRecordId)
    {
        var physicalRecord = await _dbContext.PhysicalRecords
            .AnyAsync(pr => pr.Id == physicalRecordId);

        if (!physicalRecord)
            throw new NotFoundException("PhysicalRecord", physicalRecordId);

        return await _dbContext.PhysicalRecordMovements
            .Include(m => m.FromLocation)
            .Include(m => m.ToLocation)
            .Include(m => m.MovedByUser)
            .Where(m => m.PhysicalRecordId == physicalRecordId)
            .OrderByDescending(m => m.MovedAt)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task BulkMoveAsync(IEnumerable<int> physicalRecordIds, int newLocationId, int userId)
    {
        var recordIds = physicalRecordIds.ToList();

        if (!recordIds.Any())
            throw new ValidationException("At least one physical record ID must be provided.");

        var newLocation = await _dbContext.StorageLocations
            .FirstOrDefaultAsync(sl => sl.Id == newLocationId && sl.IsActive);

        if (newLocation == null)
            throw new NotFoundException("StorageLocation", newLocationId);

        var physicalRecords = await _dbContext.PhysicalRecords
            .Where(pr => recordIds.Contains(pr.Id))
            .ToListAsync();

        if (physicalRecords.Count != recordIds.Count)
        {
            var foundIds = physicalRecords.Select(pr => pr.Id).ToHashSet();
            var missingIds = recordIds.Where(id => !foundIds.Contains(id)).ToList();
            throw new NotFoundException($"Physical records not found: {string.Join(", ", missingIds)}");
        }

        var now = DateTime.UtcNow;
        var movements = new List<PhysicalRecordMovement>();

        foreach (var record in physicalRecords)
        {
            var movement = new PhysicalRecordMovement
            {
                PhysicalRecordId = record.Id,
                FromLocationId = record.CurrentLocationId,
                ToLocationId = newLocationId,
                MovedByUserId = userId,
                MovedAt = now
            };

            movements.Add(movement);

            record.CurrentLocationId = newLocationId;
            record.Status = "InStorage";
        }

        _dbContext.PhysicalRecordMovements.AddRange(movements);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Bulk move completed: {RecordCount} physical records moved to location {ToLocationId} by user {UserId}",
            recordIds.Count, newLocationId, userId);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<StorageLocation>> GetLocationTreeAsync()
    {
        // Get all active locations and build tree in memory
        var allLocations = await _dbContext.StorageLocations
            .Where(sl => sl.IsActive)
            .OrderBy(sl => sl.LocationType)
            .ThenBy(sl => sl.LocationName)
            .ToListAsync();

        // Build parent-child relationships
        var lookup = allLocations.ToLookup(l => l.ParentId);

        foreach (var location in allLocations)
        {
            location.Children = lookup[location.Id].ToList();
        }

        // Return top-level (no parent) locations
        return allLocations.Where(l => l.ParentId == null).ToList();
    }

    /// <inheritdoc />
    public async Task<StorageLocation> CreateLocationAsync(int? parentId, string locationType, string locationName, string locationCode)
    {
        // Validate location type
        if (!ValidLocationTypes.Contains(locationType))
            throw new ValidationException(
                $"Invalid location type '{locationType}'. Must be one of: {string.Join(", ", ValidLocationTypes)}");

        if (string.IsNullOrWhiteSpace(locationName))
            throw new ValidationException("Location name is required.");

        if (string.IsNullOrWhiteSpace(locationCode))
            throw new ValidationException("Location code is required.");

        // Check for duplicate location code
        var existingCode = await _dbContext.StorageLocations
            .AnyAsync(sl => sl.LocationCode == locationCode);

        if (existingCode)
            throw new ConflictException($"A storage location with code '{locationCode}' already exists.");

        // Validate parent exists if specified
        if (parentId.HasValue)
        {
            var parentExists = await _dbContext.StorageLocations
                .AnyAsync(sl => sl.Id == parentId.Value && sl.IsActive);

            if (!parentExists)
                throw new NotFoundException("Parent StorageLocation", parentId.Value);
        }

        var location = new StorageLocation
        {
            ParentId = parentId,
            LocationType = locationType,
            LocationName = locationName,
            LocationCode = locationCode,
            IsActive = true
        };

        _dbContext.StorageLocations.Add(location);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Created storage location: {LocationCode} ({LocationType}) - {LocationName}",
            locationCode, locationType, locationName);

        return location;
    }

    /// <inheritdoc />
    public async Task<StorageLocation> UpdateLocationAsync(int id, string locationName, bool isActive)
    {
        var location = await _dbContext.StorageLocations
            .FirstOrDefaultAsync(sl => sl.Id == id);

        if (location == null)
            throw new NotFoundException("StorageLocation", id);

        if (string.IsNullOrWhiteSpace(locationName))
            throw new ValidationException("Location name is required.");

        location.LocationName = locationName;
        location.IsActive = isActive;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Updated storage location {LocationId}: Name={LocationName}, IsActive={IsActive}",
            id, locationName, isActive);

        return location;
    }

    /// <inheritdoc />
    public async Task<StorageLocation?> GetLocationByIdAsync(int id)
    {
        return await _dbContext.StorageLocations
            .Include(sl => sl.Children)
            .FirstOrDefaultAsync(sl => sl.Id == id);
    }
}
