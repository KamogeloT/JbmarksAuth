using System.Net;
using Microsoft.Extensions.Logging;

namespace Rmrs.Infrastructure.Services.Bitrix;

/// <summary>
/// Implements exponential backoff retry logic for transient Bitrix API failures.
/// Retries on 5xx errors, timeouts, and network errors.
/// Does NOT retry on 4xx errors (auth failures, validation errors).
/// </summary>
public sealed class BitrixRetryPolicy
{
    private readonly ILogger<BitrixRetryPolicy> _logger;

    /// <summary>
    /// Maximum number of retry attempts.
    /// </summary>
    public const int MaxRetries = 3;

    /// <summary>
    /// Exponential backoff delays: 1s, 4s, 16s.
    /// </summary>
    public static readonly TimeSpan[] Delays = new[]
    {
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(16)
    };

    public BitrixRetryPolicy(ILogger<BitrixRetryPolicy> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Executes an HTTP request function with retry logic for transient failures.
    /// </summary>
    /// <typeparam name="T">The expected response type.</typeparam>
    /// <param name="operation">The async operation to execute.</param>
    /// <param name="operationName">A descriptive name for logging purposes.</param>
    /// <returns>The result of the successful operation.</returns>
    /// <exception cref="BitrixApiException">Thrown when all retries are exhausted or a non-retryable error occurs.</exception>
    public async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        string operationName)
    {
        Exception? lastException = null;

        for (int attempt = 0; attempt <= MaxRetries; attempt++)
        {
            try
            {
                if (attempt > 0)
                {
                    var delay = Delays[attempt - 1];
                    _logger.LogWarning(
                        "Bitrix API retry attempt {Attempt}/{MaxRetries} for operation {Operation} after {Delay}ms delay",
                        attempt, MaxRetries, operationName, delay.TotalMilliseconds);
                    await Task.Delay(delay);
                }

                return await operation();
            }
            catch (HttpRequestException ex) when (IsTransient(ex))
            {
                lastException = ex;
                _logger.LogWarning(ex,
                    "Transient HTTP error on attempt {Attempt}/{MaxRetries} for operation {Operation}",
                    attempt + 1, MaxRetries + 1, operationName);

                if (attempt >= MaxRetries)
                    break;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException || !ex.CancellationToken.IsCancellationRequested)
            {
                lastException = ex;
                _logger.LogWarning(ex,
                    "Timeout on attempt {Attempt}/{MaxRetries} for operation {Operation}",
                    attempt + 1, MaxRetries + 1, operationName);

                if (attempt >= MaxRetries)
                    break;
            }
            catch (BitrixApiException ex) when (IsTransientStatusCode(ex.StatusCode))
            {
                lastException = ex;
                _logger.LogWarning(ex,
                    "Transient Bitrix API error (HTTP {StatusCode}) on attempt {Attempt}/{MaxRetries} for operation {Operation}",
                    (int)ex.StatusCode, attempt + 1, MaxRetries + 1, operationName);

                if (attempt >= MaxRetries)
                    break;
            }
        }

        _logger.LogError(lastException,
            "All {MaxRetries} retry attempts exhausted for Bitrix API operation {Operation}",
            MaxRetries, operationName);

        throw new BitrixApiException(
            $"Bitrix API operation '{operationName}' failed after {MaxRetries} retries.",
            lastException);
    }

    /// <summary>
    /// Executes an HTTP request function with retry logic for transient failures (void return).
    /// </summary>
    /// <param name="operation">The async operation to execute.</param>
    /// <param name="operationName">A descriptive name for logging purposes.</param>
    public async Task ExecuteWithRetryAsync(
        Func<Task> operation,
        string operationName)
    {
        await ExecuteWithRetryAsync(async () =>
        {
            await operation();
            return true;
        }, operationName);
    }

    /// <summary>
    /// Determines whether an HttpRequestException represents a transient failure.
    /// </summary>
    private static bool IsTransient(HttpRequestException ex)
    {
        if (ex.StatusCode.HasValue)
        {
            return IsTransientStatusCode(ex.StatusCode.Value);
        }

        // Network errors without a status code are considered transient
        return true;
    }

    /// <summary>
    /// Determines whether an HTTP status code represents a transient failure.
    /// 5xx errors are transient; 4xx errors are NOT retryable.
    /// </summary>
    private static bool IsTransientStatusCode(HttpStatusCode statusCode)
    {
        var code = (int)statusCode;
        return code >= 500 || statusCode == HttpStatusCode.RequestTimeout;
    }
}
