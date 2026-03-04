// Lightweight debug logger used by Bitrix24 service.
// In production this can be wired to a real logging backend.

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

class DebugLogger {
  private isEnabled(): boolean {
    // Toggle with env or config in future if needed
    return true;
  }

  async log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    if (!this.isEnabled()) return;
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${message}`, context || '');
  }

  async logError(source: string, error: unknown): Promise<void> {
    if (!this.isEnabled()) return;
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${source}`, error);
  }

  async logApiCall(method: 'GET' | 'POST', url: string, body?: unknown): Promise<void> {
    if (!this.isEnabled()) return;
    // eslint-disable-next-line no-console
    console.log(`[API CALL] ${method} ${url}`, body || '');
  }

  async logApiResponse(endpoint: string, status: number, payload: unknown): Promise<void> {
    if (!this.isEnabled()) return;
    // eslint-disable-next-line no-console
    console.log(`[API RESPONSE] ${endpoint} (${status})`, payload);
  }
}

export const debugLogger = new DebugLogger();

