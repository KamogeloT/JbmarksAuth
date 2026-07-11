namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing system configuration key-value pairs.
/// Validates values before applying and records all changes in the audit log.
/// Implements Requirements 13.1, 13.5, 13.6.
/// </summary>
public interface IConfigurationService
{
    /// <summary>
    /// Gets a typed configuration value by key.
    /// </summary>
    /// <typeparam name="T">The expected type of the configuration value.</typeparam>
    /// <param name="key">The configuration key.</param>
    /// <returns>The configuration value cast to T.</returns>
    Task<T> GetSettingAsync<T>(string key);

    /// <summary>
    /// Gets a configuration value as a string by key.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <returns>The configuration value as a string, or null if not found.</returns>
    Task<string?> GetSettingValueAsync(string key);

    /// <summary>
    /// Updates a configuration value with validation.
    /// Records the change in the audit log with previous value, new value, and reason.
    /// </summary>
    /// <param name="key">The configuration key to update.</param>
    /// <param name="value">The new configuration value.</param>
    /// <param name="adminUserId">The ID of the admin making the change.</param>
    /// <param name="reason">The reason for the change.</param>
    /// <exception cref="ConfigurationValidationException">Thrown if the value fails validation.</exception>
    Task UpdateSettingAsync(string key, string value, int adminUserId, string reason);

    /// <summary>
    /// Retrieves all system configuration settings.
    /// </summary>
    /// <returns>A collection of all configuration settings.</returns>
    Task<IEnumerable<ConfigSettingDto>> GetAllSettingsAsync();

    /// <summary>
    /// Validates a configuration value without applying it.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <param name="value">The value to validate.</param>
    /// <returns>A validation result indicating success or failure with error messages.</returns>
    ConfigValidationResult ValidateSetting(string key, string value);
}

/// <summary>
/// DTO representing a system configuration setting.
/// </summary>
public class ConfigSettingDto
{
    /// <summary>The configuration key.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>The current configuration value.</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>Description of what this configuration controls.</summary>
    public string? Description { get; set; }

    /// <summary>When this setting was last updated.</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>The user ID who last updated this setting.</summary>
    public int? UpdatedByUserId { get; set; }
}

/// <summary>
/// Result of configuration value validation.
/// </summary>
public class ConfigValidationResult
{
    /// <summary>Whether the value passed validation.</summary>
    public bool IsValid { get; set; }

    /// <summary>Validation error messages (empty if valid).</summary>
    public List<string> Errors { get; set; } = new();

    public static ConfigValidationResult Success() => new() { IsValid = true };

    public static ConfigValidationResult Failure(params string[] errors) =>
        new() { IsValid = false, Errors = errors.ToList() };
}

/// <summary>
/// Exception thrown when a configuration value fails validation.
/// </summary>
public class ConfigurationValidationException : Exception
{
    public List<string> ValidationErrors { get; }

    public ConfigurationValidationException(List<string> errors)
        : base($"Configuration validation failed: {string.Join("; ", errors)}")
    {
        ValidationErrors = errors;
    }
}
