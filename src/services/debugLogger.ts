// Debug Logger Service - Logs everything to a file
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

class DebugLogger {
  private logs: string[] = [];
  private maxLogs = 500; // Keep last 500 log entries

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  async log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    
    // Add to in-memory buffer
    this.logs.push(logEntry);
    
    // If there's additional data, add it
    if (data !== undefined) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      this.logs.push(`  DATA: ${dataStr}`);
    }
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console
    console.log(logEntry, data || '');
    
    // Write to file (async, don't wait)
    this.writeToFile().catch(err => {
      console.error('Failed to write log to file:', err);
    });
  }

  private async writeToFile() {
    try {
      const logContent = this.logs.join('\n');
      
      await Filesystem.writeFile({
        path: 'sdinmotion_debug.log',
        data: logContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    } catch (error) {
      console.error('Error writing log file:', error);
    }
  }

  async getLogs(): Promise<string> {
    return this.logs.join('\n');
  }

  async clearLogs() {
    this.logs = [];
    try {
      await Filesystem.deleteFile({
        path: 'sdinmotion_debug.log',
        directory: Directory.Documents
      });
    } catch (error) {
      // File might not exist, that's ok
    }
  }

  // Log API calls
  async logApiCall(method: string, url: string, params?: any) {
    await this.log('INFO', `API CALL: ${method} ${url}`, params);
  }

  // Log API responses
  async logApiResponse(url: string, status: number, response: any) {
    await this.log('INFO', `API RESPONSE: ${url} (${status})`, response);
  }

  // Log errors
  async logError(context: string, error: any) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    };
    await this.log('ERROR', `ERROR in ${context}`, errorDetails);
  }
}

export const debugLogger = new DebugLogger();

