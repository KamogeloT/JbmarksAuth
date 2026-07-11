using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages system configuration key-value pairs with validation and audit logging.
/// Implements Requirements 13.1, 13.5, 13.6.
/// </summary>
public class ConfigurationService : IConfigurationService
{
    private readonly RmrsDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<ConfigurationService> _logger;

    /// <summary>
    /// Defines validation rules for known configuration keys.
    /// Keys not in this dictionary are treated as free-form text.
    /// </summary>
    private static readonly Dictionary<string, Func<string, ConfigValidationResult>> _validators = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OAuth:ClientId"] = ValidateNonEmpty,
        ["OAuth:ClientSecret"] = ValidateNonEmpty,
        ["OAuth:AuthorizationUrl"] = ValidateUrl,
        ["OAuth:TokenUrl"] = ValidateUrl,
        ["OAuth:CallbackUrl"] = ValidateUrl,
        ["Bitrix:PlatformBaseUrl"] = ValidateUrl,
        ["Bitrix:OAuthBaseUrl"] = ValidateUrl,
        ["Jobs:RetentionCheckIntervalHours"] = ValidatePositiveInteger,
        ["Jobs:OverdueLoanCheckIntervalHours"] = ValidatePositiveInteger,
        ["Jobs:TokenRefreshIntervalMinutes"] = ValidatePositiveInteger,
        ["Session:TimeoutMinutes"] = ValidatePositiveInteger,
        ["Upload:MaxFileSizeMB"] = ValidatePositiveInteger,
    };

    public ConfigurationService(
        RmrsDbContext dbContext,
        IAuditLogService auditLogService,
        ILogger<ConfigurationService> logger)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<T> GetSettingAsync<T>(string key)
    {
        var config = await _dbContext.SystemConfigurations
            .FirstOrDefaultAsync(c => c.ConfigKey == key);

        if (config == null)
            throw new KeyNotFoundException($"Configuration key '{key}' not found.");

        return (T)Convert.ChangeType(config.ConfigValue, typeof(T));
    }

    /// <inheritdoc />
    public async Task<string?> GetSettingValueAsync(string key)
    {
        var config = await _dbContext.SystemConfigurations
            .FirstOrDefaultAsync(c => c.ConfigKey == key);

        return config?.ConfigValue;
    }

    /// <inheritdoc />
    public async Task UpdateSettingAsync(string key, string value, int adminUserId, string reason)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Configuration key cannot be empty.", nameof(key));
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Reason for change is required.", nameof(reason));

        // Validate the value before applying (Requirement 13.6)
        var validationResult = ValidateSetting(key, value);
        if (!validationResult.IsValid)
        {
            _logger.LogWarning(
                "Configuration validation failed for key '{Key}': {Errors}",
                key, string.Join("; ", validationResult.Errors));
            throw new ConfigurationValidationException(validationResult.Errors);
        }

        var config = await _dbContext.SystemConfigurations
            .FirstOrDefaultAsync(c => c.ConfigKey == key);

        string? previousValue = null;

        if (config == null)
        {
            // Create new configuration entry
            config = new SystemConfiguration
            {
                ConfigKey = key,
                ConfigValue = value,
                UpdatedByUserId = adminUserId,
                UpdatedAt = DateTime.UtcNow
            };
            _dbContext.SystemConfigurations.Add(config);
        }
        else
        {
            previousValue = config.ConfigValue;
            config.ConfigValue = value;
            config.UpdatedByUserId = adminUserId;
            config.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        // Record configuration change in audit log (Requirement 13.5)
        await _auditLogService.LogAsync(new AuditEntry(
            UserId: adminUserId,
            ActionType: "ConfigurationChange",
            EntityType: "SystemConfiguration",
            EntityId: config.Id,
            PreviousValue: previousValue,
            NewValue: $"Key={key}, Value={value}, Reason={reason}"
        ));

        _logger.LogInformation(
            "Configuration '{Key}' updated by user {UserId}. Reason: {Reason}",
            key, adminUserId, reason);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ConfigSettingDto>> GetAllSettingsAsync()
    {
        var settings = await _dbContext.SystemConfigurations
            .OrderBy(c => c.ConfigKey)
            .ToListAsync();

        return settings.Select(s => new ConfigSettingDto
        {
            Key = s.ConfigKey,
            Value = s.ConfigValue,
            Description = s.Description,
            UpdatedAt = s.UpdatedAt,
            UpdatedByUserId = s.UpdatedByUserId
        });
    }

    /// <inheritdoc />
    public ConfigValidationResult ValidateSetting(string key, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return ConfigValidationResult.Failure("Configuration value cannot be empty.");

        // If we have a specific validator for this key, use it
        if (_validators.TryGetValue(key, out var validator))
        {
            return validator(value);
        }

        // For unknown keys, allow any non-empty value
        return ConfigValidationResult.Success();
    }

    // ─── Validation Helpers ────────────────────────────────────────────

    private static ConfigValidationResult ValidateNonEmpty(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return ConfigValidationResult.Failure("Value cannot be empty.");
        return ConfigValidationResult.Success();
    }

    private static ConfigValidationResult ValidateUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return ConfigValidationResult.Failure("URL cannot be empty.");

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            return ConfigValidationResult.Failure($"'{value}' is not a valid URL.");

        if (uri.Scheme != "https" && uri.Scheme != "http")
            return ConfigValidationResult.Failure("URL must use HTTP or HTTPS scheme.");

        return ConfigValidationResult.Success();
    }

    private static ConfigValidationResult ValidatePositiveInteger(string value)
    {
        if (!int.TryParse(value, out var intValue))
            return ConfigValidationResult.Failure($"'{value}' is not a valid integer.");

        if (intValue <= 0)
            return ConfigValidationResult.Failure("Value must be a positive integer greater than 0.");

        return ConfigValidationResult.Success();
    }
}
