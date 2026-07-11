using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Generates unique registry numbers following the pattern RMRS/{DEPT}/{YYYY}/{SEQ:00000}.
/// Uses database-level locking (serializable transaction) to ensure thread-safe atomic
/// sequence increments — no duplicates under concurrent requests.
/// The sequence resets to 00001 at the start of each calendar year per department.
/// </summary>
public class RegistryNumberGenerator : IRegistryNumberGenerator
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<RegistryNumberGenerator> _logger;

    public RegistryNumberGenerator(
        RmrsDbContext dbContext,
        ILogger<RegistryNumberGenerator> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string> GenerateNextAsync(string departmentCode)
    {
        if (string.IsNullOrWhiteSpace(departmentCode))
            throw new ArgumentException("Department code is required.", nameof(departmentCode));

        var currentYear = DateTime.UtcNow.Year;
        var nextSequence = await GetNextSequenceAsync(departmentCode, currentYear);

        var registryNumber = $"RMRS/{departmentCode}/{currentYear}/{nextSequence:D5}";

        _logger.LogDebug(
            "Generated registry number {RegistryNumber} for department {DepartmentCode}, year {Year}, sequence {Sequence}",
            registryNumber, departmentCode, currentYear, nextSequence);

        return registryNumber;
    }

    /// <summary>
    /// Gets the next sequence number for a given department and year.
    /// Uses a serializable transaction with row-level locking to guarantee
    /// atomic increment even under concurrent requests.
    /// If no row exists for the department/year combination, creates one starting at 1.
    /// This handles the yearly reset automatically — a new row is created for each new year.
    /// </summary>
    private async Task<int> GetNextSequenceAsync(string departmentCode, int year)
    {
        // Use raw SQL with UPDLOCK, HOLDLOCK hints for atomic increment
        // This ensures that concurrent requests serialize on the same department/year row
        var nextSequence = await ExecuteAtomicIncrementAsync(departmentCode, year);
        return nextSequence;
    }

    /// <summary>
    /// Executes an atomic increment using raw SQL within a serializable transaction.
    /// Uses MERGE with HOLDLOCK to handle both insert (new year) and update (existing year) atomically.
    /// </summary>
    private async Task<int> ExecuteAtomicIncrementAsync(string departmentCode, int year)
    {
        // Using ExecuteSqlRawAsync with OUTPUT to atomically increment and return the new value.
        // The MERGE statement handles both cases:
        // 1. Row doesn't exist (new year/department): INSERT with CurrentSequence = 1
        // 2. Row exists: UPDATE CurrentSequence = CurrentSequence + 1
        // HOLDLOCK + SERIALIZABLE ensures no duplicates under concurrency.

        var connection = _dbContext.Database.GetDbConnection();
        await _dbContext.Database.OpenConnectionAsync();

        try
        {
            using var command = connection.CreateCommand();
            command.Transaction = _dbContext.Database.CurrentTransaction?.GetDbTransaction();

            // Use a transaction with serializable isolation to prevent race conditions
            var useExternalTransaction = command.Transaction != null;

            if (!useExternalTransaction)
            {
                var transaction = await connection.BeginTransactionAsync(
                    System.Data.IsolationLevel.Serializable);
                command.Transaction = transaction;
            }

            try
            {
                command.CommandText = @"
                    MERGE INTO RegistrySequences WITH (HOLDLOCK) AS target
                    USING (SELECT @DepartmentCode AS DepartmentCode, @Year AS [Year]) AS source
                    ON target.DepartmentCode = source.DepartmentCode AND target.[Year] = source.[Year]
                    WHEN MATCHED THEN
                        UPDATE SET CurrentSequence = target.CurrentSequence + 1
                    WHEN NOT MATCHED THEN
                        INSERT (DepartmentCode, [Year], CurrentSequence)
                        VALUES (source.DepartmentCode, source.[Year], 1)
                    OUTPUT INSERTED.CurrentSequence;";

                var deptParam = command.CreateParameter();
                deptParam.ParameterName = "@DepartmentCode";
                deptParam.Value = departmentCode;
                command.Parameters.Add(deptParam);

                var yearParam = command.CreateParameter();
                yearParam.ParameterName = "@Year";
                yearParam.Value = year;
                command.Parameters.Add(yearParam);

                var result = await command.ExecuteScalarAsync();

                if (!useExternalTransaction && command.Transaction != null)
                {
                    await command.Transaction.CommitAsync();
                }

                if (result == null)
                {
                    throw new InvalidOperationException(
                        $"Failed to generate sequence number for department '{departmentCode}', year {year}.");
                }

                return Convert.ToInt32(result);
            }
            catch
            {
                if (!useExternalTransaction && command.Transaction != null)
                {
                    await command.Transaction.RollbackAsync();
                }
                throw;
            }
        }
        finally
        {
            // Don't close if there's an ambient EF transaction managing the connection
            if (_dbContext.Database.CurrentTransaction == null)
            {
                await _dbContext.Database.CloseConnectionAsync();
            }
        }
    }
}
