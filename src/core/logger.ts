/**
 * BACK14: Structured Logger.
 * Diagnostic simulation logging with exportable session trace.
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  channel: string;
  message: string;
  data?: any;
}

export class Logger {
  private maxEntries: number = 200;
  private entries: LogEntry[] = [];
  private minLevel: LogLevel = "info";

  private levelOrder: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  log(level: LogLevel, channel: string, message: string, data?: any): void {
    if (this.levelOrder[level] < this.levelOrder[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      channel,
      message,
      data,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  info(channel: string, message: string, data?: any): void {
    this.log("info", channel, message, data);
  }

  warn(channel: string, message: string, data?: any): void {
    this.log("warn", channel, message, data);
  }

  error(channel: string, message: string, data?: any): void {
    this.log("error", channel, message, data);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  exportTraceJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
  }
}

export const appLogger = new Logger();
