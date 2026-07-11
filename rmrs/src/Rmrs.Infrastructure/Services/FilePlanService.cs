using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Business logic for managing the hierarchical file plan.
/// Handles tree manipulation, validation, deactivation logic, and depth constraint enforcement.
/// File plan entries are organized in a hierarchy of up to 5 levels.
/// Uses in-memory caching for tree retrieval with invalidation on mutations.
/// </summary>
public class FilePlanService : IFilePlanService
{
    private const int MaxTreeDepth = 5;
    private const string FilePlanTreeCacheKey = "FilePlanTree";

    private readonly RmrsDbContext _dbContext;
    private readonly IUserContext _userContext;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FilePlanService> _logger;

    public FilePlanService(
        RmrsDbContext dbContext,
        IUserContext userContext,
        IMemoryCache cache,
        ILogger<FilePlanService> logger)
    {
        _dbContext = dbContext;
        _userContext = userContext;
        _cache = cache;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<FilePlanEntry> CreateEntryAsync(
        int? parentId,
        string classificationCode,
        string title,
        string description,
        int retentionRuleId,
        string disposalAuthorityRef,
        int defaultClassificationLevel)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(classificationCode))
            throw new ValidationException("Classification code is required.");

        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");

        if (string.IsNullOrWhiteSpace(description))
            throw new ValidationException("Description is required.");

        if (retentionRuleId <= 0)
            throw new ValidationException("A valid retention rule must be specified.");

        if (string.IsNullOrWhiteSpace(disposalAuthorityRef))
            throw new ValidationException("Disposal authority reference is required.");

        if (defaultClassificationLevel < 0)
            throw new ValidationException("Default classification level must be zero or positive.");

        // Validate classification code uniqueness
        var codeExists = await _dbContext.FilePlanEntries
            .AnyAsync(e => e.ClassificationCode == classificationCode.Trim());
        if (codeExists)
            throw new ConflictException(
                $"A file plan entry with classification code '{classificationCode}' already exists.");

        // Validate retention rule exists
        var retentionRule = await _dbContext.RetentionRules
            .FirstOrDefaultAsync(r => r.Id == retentionRuleId && r.IsActive);
        if (retentionRule == null)
            throw new ValidationException(
                $"Retention rule with ID '{retentionRuleId}' does not exist or is inactive.");

        // Determine level based on parent
        int level = 1;
        if (parentId.HasValue)
        {
            var parent = await _dbContext.FilePlanEntries
                .FirstOrDefaultAsync(e => e.Id == parentId.Value);

            if (parent == null)
                throw new NotFoundException("FilePlanEntry", parentId.Value);

            if (!parent.IsActive)
                throw new ValidationException(
                    "Cannot create a child entry under a deactivated file plan entry.");

            level = parent.Level + 1;

            if (level > MaxTreeDepth)
                throw new ValidationException(
                    $"File plan tree depth cannot exceed {MaxTreeDepth} levels. " +
                    $"The parent entry is at level {parent.Level}.");
        }

        // Create the entry
        var entry = new FilePlanEntry
        {
            ParentId = parentId,
            ClassificationCode = classificationCode.Trim(),
            Title = title.Trim(),
            Description = description.Trim(),
            Level = level,
            RetentionRuleId = retentionRuleId,
            DisposalAuthorityRef = disposalAuthorityRef.Trim(),
            DefaultClassificationLevel = defaultClassificationLevel,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.FilePlanEntries.Add(entry);
        await _dbContext.SaveChangesAsync();

        // Invalidate file plan tree cache on any mutation
        InvalidateTreeCache();

        _logger.LogInformation(
            "File plan entry created: {ClassificationCode} at level {Level} by user {UserId}",
            entry.ClassificationCode, entry.Level, _userContext.UserId);

        return entry;
    }

    /// <inheritdoc/>
    public async Task<FilePlanEntry> UpdateEntryAsync(
        int id,
        string title,
        string description,
        int retentionRuleId,
        string disposalAuthorityRef,
        int defaultClassificationLevel)
    {
        var entry = await _dbContext.FilePlanEntries
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entry == null)
            throw new NotFoundException("FilePlanEntry", id);

        if (!entry.IsActive)
            throw new ValidationException(
                "Cannot update a deactivated file plan entry.");

        // Validate required fields
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");

        if (string.IsNullOrWhiteSpace(description))
            throw new ValidationException("Description is required.");

        if (retentionRuleId <= 0)
            throw new ValidationException("A valid retention rule must be specified.");

        if (string.IsNullOrWhiteSpace(disposalAuthorityRef))
            throw new ValidationException("Disposal authority reference is required.");

        if (defaultClassificationLevel < 0)
            throw new ValidationException("Default classification level must be zero or positive.");

        // Validate retention rule exists
        var retentionRule = await _dbContext.RetentionRules
            .FirstOrDefaultAsync(r => r.Id == retentionRuleId && r.IsActive);
        if (retentionRule == null)
            throw new ValidationException(
                $"Retention rule with ID '{retentionRuleId}' does not exist or is inactive.");

        // Apply updates
        entry.Title = title.Trim();
        entry.Description = description.Trim();
        entry.RetentionRuleId = retentionRuleId;
        entry.DisposalAuthorityRef = disposalAuthorityRef.Trim();
        entry.DefaultClassificationLevel = defaultClassificationLevel;
        entry.UpdatedAt = DateTime.UtcNow;

        _dbContext.FilePlanEntries.Update(entry);
        await _dbContext.SaveChangesAsync();

        // Invalidate file plan tree cache on any mutation
        InvalidateTreeCache();

        _logger.LogInformation(
            "File plan entry updated: {ClassificationCode} (ID {Id}) by user {UserId}",
            entry.ClassificationCode, entry.Id, _userContext.UserId);

        return entry;
    }

    /// <inheritdoc/>
    public async Task DeactivateEntryAsync(int id)
    {
        var entry = await _dbContext.FilePlanEntries
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entry == null)
            throw new NotFoundException("FilePlanEntry", id);

        if (!entry.IsActive)
            throw new ValidationException(
                "This file plan entry is already deactivated.");

        // Deactivate the entry (don't delete — records may still reference it)
        entry.IsActive = false;
        entry.DeactivatedAt = DateTime.UtcNow;
        entry.UpdatedAt = DateTime.UtcNow;

        _dbContext.FilePlanEntries.Update(entry);
        await _dbContext.SaveChangesAsync();

        // Invalidate file plan tree cache on any mutation
        InvalidateTreeCache();

        _logger.LogInformation(
            "File plan entry deactivated: {ClassificationCode} (ID {Id}) by user {UserId}",
            entry.ClassificationCode, entry.Id, _userContext.UserId);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<FilePlanEntry>> GetTreeAsync()
    {
        // Return cached tree if available
        if (_cache.TryGetValue(FilePlanTreeCacheKey, out IEnumerable<FilePlanEntry>? cachedTree) && cachedTree != null)
        {
            _logger.LogDebug("Returning file plan tree from cache.");
            return cachedTree;
        }

        // Load all entries and build the tree in memory
        var allEntries = await _dbContext.FilePlanEntries
            .AsNoTracking()
            .Include(e => e.RetentionRule)
            .OrderBy(e => e.Level)
            .ThenBy(e => e.ClassificationCode)
            .ToListAsync();

        // Build the tree structure: assign children to their parents
        var entryMap = allEntries.ToDictionary(e => e.Id);

        foreach (var entry in allEntries)
        {
            // Clear the navigation property first to avoid circular references from EF tracking
            entry.Children = new List<FilePlanEntry>();
        }

        foreach (var entry in allEntries)
        {
            if (entry.ParentId.HasValue && entryMap.TryGetValue(entry.ParentId.Value, out var parent))
            {
                parent.Children.Add(entry);
            }
        }

        // Return only root-level entries (Level 1 / no parent)
        var roots = allEntries.Where(e => e.ParentId == null).ToList();

        // Cache the tree with a sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromMinutes(30))
            .SetAbsoluteExpiration(TimeSpan.FromHours(2));

        _cache.Set(FilePlanTreeCacheKey, (IEnumerable<FilePlanEntry>)roots, cacheOptions);
        _logger.LogDebug("File plan tree cached successfully ({Count} root entries).", roots.Count);

        return roots;
    }

    /// <inheritdoc/>
    public async Task<FilePlanEntry?> GetEntryByIdAsync(int id)
    {
        return await _dbContext.FilePlanEntries
            .AsNoTracking()
            .Include(e => e.RetentionRule)
            .Include(e => e.Children)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<FilePlanEntry>> GetChildrenAsync(int parentId)
    {
        // Verify parent exists
        var parentExists = await _dbContext.FilePlanEntries
            .AnyAsync(e => e.Id == parentId);

        if (!parentExists)
            throw new NotFoundException("FilePlanEntry", parentId);

        return await _dbContext.FilePlanEntries
            .AsNoTracking()
            .Include(e => e.RetentionRule)
            .Where(e => e.ParentId == parentId)
            .OrderBy(e => e.ClassificationCode)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<bool> HasActiveRecordsAsync(int entryId)
    {
        return await _dbContext.Records
            .AnyAsync(r => r.FilePlanEntryId == entryId && r.Status == "Active");
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Invalidates the cached file plan tree, forcing the next GetTreeAsync call to reload from DB.
    /// </summary>
    private void InvalidateTreeCache()
    {
        _cache.Remove(FilePlanTreeCacheKey);
        _logger.LogDebug("File plan tree cache invalidated.");
    }
}
