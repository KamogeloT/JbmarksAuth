using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages background job scheduling and configuration.
/// Allows System_Administrator to view and update job configurations.
/// Implements Requirements 13.4.
/// </summary>
public interface IScheduledJobService
{
    /// <summary>
    /// Gets all scheduled job configurations.
    /// </summary>
    Task<IEnumerable<ScheduledJobDto>> GetAllJobsAsync();

    /// <summary>
    /// Gets a specific job configuration by ID.
    /// </summary>
    Task<ScheduledJobDto?> GetJobByIdAsync(string jobId);

    /// <summary>
    /// Updates a scheduled job's configuration.
    /// </summary>
    Task<ScheduledJobDto> UpdateJobAsync(string jobId, UpdateScheduledJobRequest request);
}

/// <summary>
/// DTO representing a scheduled job configuration.
/// </summary>
public class ScheduledJobDto
{
    /// <summary>Unique job identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Human-readable job name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Description of what the job does.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Whether the job is currently enabled.</summary>
    public bool IsEnabled { get; set; }

    /// <summary>Interval in minutes between executions.</summary>
    public int IntervalMinutes { get; set; }

    /// <summary>Scheduled time (HH:mm format) for daily jobs, or null for interval-based.</summary>
    public string? ScheduledTime { get; set; }

    /// <summary>When the job last executed.</summary>
    public DateTime? LastRunAt { get; set; }

    /// <summary>When the job is next scheduled to run.</summary>
    public DateTime? NextRunAt { get; set; }
}

/// <summary>
/// Request to update a scheduled job's configuration.
/// </summary>
public class UpdateScheduledJobRequest
{
    /// <summary>Whether the job should be enabled.</summary>
    public bool? IsEnabled { get; set; }

    /// <summary>Interval in minutes between executions.</summary>
    public int? IntervalMinutes { get; set; }

    /// <summary>Scheduled time (HH:mm format) for daily jobs.</summary>
    public string? ScheduledTime { get; set; }
}

/// <summary>
/// Implementation of IScheduledJobService managing background job scheduling.
/// Job configurations are stored in the SystemConfiguration table with "Job:" prefix.
/// </summary>
public class ScheduledJobService : IScheduledJobService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<ScheduledJobService> _logger;

    /// <summary>
    /// Predefined scheduled jobs in the system.
    /// </summary>
    private static readonly List<ScheduledJobDefinition> _jobDefinitions = new()
    {
        new ScheduledJobDefinition
        {
            Id = "retention_expiry_check",
            Name = "Retention Expiry Check",
            Description = "Identifies records past their retention expiry date and flags them as disposal candidates.",
            DefaultIntervalMinutes = 1440, // 24 hours
            DefaultScheduledTime = "02:00"
        },
        new ScheduledJobDefinition
        {
            Id = "overdue_loan_notifier",
            Name = "Overdue Loan Notifier",
            Description = "Sends notifications for overdue physical record loans.",
            DefaultIntervalMinutes = 1440, // 24 hours
            DefaultScheduledTime = "08:00"
        },
        new ScheduledJobDefinition
        {
            Id = "token_refresh_monitor",
            Name = "Token Refresh Monitor",
            Description = "Pre-emptively refreshes OAuth tokens that are near expiry.",
            DefaultIntervalMinutes = 30,
            DefaultScheduledTime = null
        }
    };

    public ScheduledJobService(RmrsDbContext dbContext, ILogger<ScheduledJobService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ScheduledJobDto>> GetAllJobsAsync()
    {
        var jobs = new List<ScheduledJobDto>();

        foreach (var definition in _jobDefinitions)
        {
            var job = await BuildJobDtoAsync(definition);
            jobs.Add(job);
        }

        return jobs;
    }

    /// <inheritdoc />
    public async Task<ScheduledJobDto?> GetJobByIdAsync(string jobId)
    {
        var definition = _jobDefinitions.FirstOrDefault(j => j.Id == jobId);
        if (definition == null)
            return null;

        return await BuildJobDtoAsync(definition);
    }

    /// <inheritdoc />
    public async Task<ScheduledJobDto> UpdateJobAsync(string jobId, UpdateScheduledJobRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var definition = _jobDefinitions.FirstOrDefault(j => j.Id == jobId);
        if (definition == null)
            throw new KeyNotFoundException($"Scheduled job '{jobId}' not found.");

        // Update configuration values in SystemConfiguration table
        if (request.IsEnabled.HasValue)
        {
            await SetJobConfigAsync($"Job:{jobId}:Enabled", request.IsEnabled.Value.ToString());
        }

        if (request.IntervalMinutes.HasValue)
        {
            if (request.IntervalMinutes.Value <= 0)
                throw new ArgumentException("Interval must be a positive number of minutes.");

            await SetJobConfigAsync($"Job:{jobId}:IntervalMinutes", request.IntervalMinutes.Value.ToString());
        }

        if (request.ScheduledTime != null)
        {
            if (!TimeOnly.TryParse(request.ScheduledTime, out _))
                throw new ArgumentException($"'{request.ScheduledTime}' is not a valid time format (HH:mm).");

            await SetJobConfigAsync($"Job:{jobId}:ScheduledTime", request.ScheduledTime);
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Scheduled job '{JobId}' configuration updated.", jobId);

        return await BuildJobDtoAsync(definition);
    }

    private async Task<ScheduledJobDto> BuildJobDtoAsync(ScheduledJobDefinition definition)
    {
        var isEnabled = await GetJobConfigAsync($"Job:{definition.Id}:Enabled");
        var intervalMinutes = await GetJobConfigAsync($"Job:{definition.Id}:IntervalMinutes");
        var scheduledTime = await GetJobConfigAsync($"Job:{definition.Id}:ScheduledTime");
        var lastRunAt = await GetJobConfigAsync($"Job:{definition.Id}:LastRunAt");

        var interval = intervalMinutes != null ? int.Parse(intervalMinutes) : definition.DefaultIntervalMinutes;
        var enabled = isEnabled != null ? bool.Parse(isEnabled) : true;

        return new ScheduledJobDto
        {
            Id = definition.Id,
            Name = definition.Name,
            Description = definition.Description,
            IsEnabled = enabled,
            IntervalMinutes = interval,
            ScheduledTime = scheduledTime ?? definition.DefaultScheduledTime,
            LastRunAt = lastRunAt != null ? DateTime.Parse(lastRunAt) : null,
            NextRunAt = CalculateNextRun(enabled, interval, scheduledTime ?? definition.DefaultScheduledTime, lastRunAt)
        };
    }

    private async Task<string?> GetJobConfigAsync(string key)
    {
        var config = await _dbContext.SystemConfigurations
            .FirstOrDefaultAsync(c => c.ConfigKey == key);
        return config?.ConfigValue;
    }

    private async Task SetJobConfigAsync(string key, string value)
    {
        var config = await _dbContext.SystemConfigurations
            .FirstOrDefaultAsync(c => c.ConfigKey == key);

        if (config == null)
        {
            config = new Domain.Entities.SystemConfiguration
            {
                ConfigKey = key,
                ConfigValue = value,
                UpdatedAt = DateTime.UtcNow
            };
            _dbContext.SystemConfigurations.Add(config);
        }
        else
        {
            config.ConfigValue = value;
            config.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static DateTime? CalculateNextRun(bool enabled, int intervalMinutes, string? scheduledTime, string? lastRunAt)
    {
        if (!enabled)
            return null;

        var now = DateTime.UtcNow;

        if (scheduledTime != null && TimeOnly.TryParse(scheduledTime, out var time))
        {
            // Daily job at a specific time
            var todayScheduled = now.Date.Add(time.ToTimeSpan());
            if (now < todayScheduled)
                return todayScheduled;
            return todayScheduled.AddDays(1);
        }

        // Interval-based job
        if (lastRunAt != null && DateTime.TryParse(lastRunAt, out var lastRun))
        {
            return lastRun.AddMinutes(intervalMinutes);
        }

        return now.AddMinutes(intervalMinutes);
    }
}

internal class ScheduledJobDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DefaultIntervalMinutes { get; set; }
    public string? DefaultScheduledTime { get; set; }
}
