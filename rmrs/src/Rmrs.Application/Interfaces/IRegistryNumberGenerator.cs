namespace Rmrs.Application.Interfaces;

/// <summary>
/// Generates unique registry numbers following the pattern RMRS/{DEPT}/{YYYY}/{SEQ:00000}.
/// Thread-safe: uses database-level locking to ensure no duplicates under concurrent requests.
/// </summary>
public interface IRegistryNumberGenerator
{
    /// <summary>
    /// Generates the next sequential registry number for the given department.
    /// The sequence resets to 00001 at the start of each calendar year per department.
    /// </summary>
    /// <param name="departmentCode">The department code (e.g., "FIN", "HR").</param>
    /// <returns>A registry number in the format RMRS/{DEPT}/{YYYY}/{SEQ:00000}.</returns>
    Task<string> GenerateNextAsync(string departmentCode);
}
