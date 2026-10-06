import fs from 'node:fs';
import path from 'node:path';

export type LogLevelName = 'DEBUG' | 'INFO' | 'WARN' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'FATAL';

export const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
  FATAL: 50,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LoggerManagerOptions {
  folderName?: string;
  loggerName?: string;
  maxBytes?: number;
  backupCount?: number;
  level?: LogLevelName | LogLevel | number;
  console?: boolean;
  logDir?: string;
  enableFileLogging?: boolean;
}

export interface LogRecord {
  timestamp: string;
  level: string;
  name: string;
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
  error?: Error;
}

// Fallback configuration defaults matching Python logger_manager
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB default (configurable via LOG_MAX_BYTES up to 1 GiB)
const DEFAULT_BACKUP_COUNT = 3;
const DEFAULT_LOG_LEVEL = LogLevel.INFO;
const DEFAULT_CONSOLE = true;
const DEFAULT_LOGGER_NAME = 'activity_logger';
const DEFAULT_LOG_FILENAME = 'activity.log';

function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(process.versions?.node);
}

function resolveProjectRoot(): string {
  if (typeof process !== 'undefined' && process.cwd) {
    return process.cwd();
  }
  return '.';
}

function parseLogLevel(val: unknown, defaultLevel: LogLevel = DEFAULT_LOG_LEVEL): LogLevel {
  if (val === undefined || val === null) return defaultLevel;
  if (typeof val === 'number') return val as LogLevel;

  const str = String(val).trim().toUpperCase();
  switch (str) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'CRITICAL':
    case 'FATAL':
      return LogLevel.CRITICAL;
    default:
      return defaultLevel;
  }
}

function parseBoolean(val: unknown, defaultVal: boolean): boolean {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'boolean') return val;
  const norm = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(norm)) return true;
  if (['false', '0', 'no', 'off'].includes(norm)) return false;
  return defaultVal;
}

function getLogLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    case LogLevel.CRITICAL:
      return 'CRITICAL';
    default:
      return 'LOG';
  }
}

/**
 * Production-ready centralized application and activity logger.
 * Features automated size-based daily sequential rotation, singleton handler caching,
 * context attachment, and cross-runtime compatibility.
 */
export class LoggerManager {
  private static readonly _configuredLoggers = new Map<string, LoggerManager>();

  public readonly folderName: string;
  public readonly loggerName: string;
  public readonly maxBytes: number;
  public readonly backupCount: number;
  public readonly level: LogLevel;
  public readonly consoleEnabled: boolean;
  public readonly logDir: string;
  public readonly logFilePath: string;
  public readonly enableFileLogging: boolean;

  constructor(options: LoggerManagerOptions = {}) {
    this.folderName = (options.folderName || process.env.LOG_FOLDER || 'system').trim().replace(/^\/+|\/+$/g, '');
    this.loggerName = (options.loggerName || process.env.LOG_NAME || DEFAULT_LOGGER_NAME).trim();

    this.maxBytes =
      options.maxBytes ??
      (process.env.LOG_MAX_BYTES ? Number.parseInt(process.env.LOG_MAX_BYTES, 10) : DEFAULT_MAX_BYTES);
    if (!Number.isFinite(this.maxBytes) || this.maxBytes <= 0) {
      this.maxBytes = DEFAULT_MAX_BYTES;
    }

    this.backupCount =
      options.backupCount ??
      (process.env.LOG_BACKUP_COUNT ? Number.parseInt(process.env.LOG_BACKUP_COUNT, 10) : DEFAULT_BACKUP_COUNT);
    if (!Number.isFinite(this.backupCount) || this.backupCount < 0) {
      this.backupCount = DEFAULT_BACKUP_COUNT;
    }

    const envLevel = process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL;
    this.level = parseLogLevel(options.level ?? envLevel, DEFAULT_LOG_LEVEL);
    this.consoleEnabled = parseBoolean(options.console ?? process.env.LOG_CONSOLE, DEFAULT_CONSOLE);

    const baseLogsDir = options.logDir || process.env.LOG_DIR || path.join(resolveProjectRoot(), 'logs');
    this.logDir = path.join(baseLogsDir, this.folderName);
    this.logFilePath = path.join(this.logDir, DEFAULT_LOG_FILENAME);

    this.enableFileLogging = options.enableFileLogging ?? isServerEnvironment();
  }

  /**
   * Singleton factory to retrieve or create a configured LoggerManager instance.
   */
  public static getInstance(options: LoggerManagerOptions = {}): LoggerManager {
    const folder = (options.folderName || process.env.LOG_FOLDER || 'system').trim();
    const name = (options.loggerName || process.env.LOG_NAME || DEFAULT_LOGGER_NAME).trim();
    const key = `${folder}:${name}`;

    if (!LoggerManager._configuredLoggers.has(key)) {
      LoggerManager._configuredLoggers.set(key, new LoggerManager(options));
    }
    return LoggerManager._configuredLoggers.get(key)!;
  }

  /**
   * Core logging handler
   */
  public log(level: LogLevel, message: unknown, ...args: unknown[]): void {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = getLogLevelName(level);
    const formattedMsg = this.formatMessage(message, args);

    // Retrieve active context if available (from AsyncLocalStorage in logging-config)
    const contextStr = this.getActiveContextString();

    const formattedLine = `[${timestamp}] [${levelName}] [${this.loggerName}]${contextStr} ${formattedMsg}`;

    // 1. Output to Console if enabled
    if (this.consoleEnabled) {
      this.writeConsole(level, formattedLine);
    }

    // 2. Output to Rotating File on Server
    if (this.enableFileLogging) {
      this.writeToFile(formattedLine);
    }
  }

  public debug(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public critical(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.CRITICAL, message, ...args);
  }

  public exception(message: unknown, error?: unknown, ...args: unknown[]): void {
    const errObj = error instanceof Error ? `\n${error.stack || error.message}` : error ? `\n${String(error)}` : '';
    this.log(LogLevel.ERROR, `${String(message)}${errObj}`, ...args);
  }

  private formatMessage(message: unknown, args: unknown[]): string {
    let base = typeof message === 'string' ? message : JSON.stringify(message);
    if (args.length > 0) {
      const formattedArgs = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
      base = `${base} ${formattedArgs}`;
    }
    return base;
  }

  private getActiveContextString(): string {
    // Dynamically query logging context if registered globally
    const g = globalThis as unknown as { __LOGGER_GET_CONTEXT__?: () => { requestId?: string; userId?: string } | undefined };
    if (typeof g.__LOGGER_GET_CONTEXT__ === 'function') {
      const ctx = g.__LOGGER_GET_CONTEXT__();
      if (ctx && (ctx.requestId || ctx.userId)) {
        const req = ctx.requestId || '-';
        const user = ctx.userId || '-';
        return ` [req=${req} user=${user}]`;
      }
    }
    return '';
  }

  private writeConsole(level: LogLevel, line: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(line);
        break;
      case LogLevel.INFO:
        console.info(line);
        break;
      case LogLevel.WARN:
        console.warn(line);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(line);
        break;
      default:
        console.log(line);
    }
  }

  /**
   * Appends to active log file, performing rotation when maxBytes is exceeded.
   */
  private writeToFile(line: string): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Check current file size for rotation
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size >= this.maxBytes) {
          this.doRollover();
        }
      }

      fs.appendFileSync(this.logFilePath, `${line}\n`, { encoding: 'utf8' });
    } catch {
      // Fallback silently if filesystem is temporarily restricted
    }
  }

  /**
   * Daily sequential rollover matching Python DailySequentialRotatingFileHandler:
   * 1. Rolls over 'activity.log' into 'activity_YYYY-MM-DD_NN.log'
   * 2. Purges oldest backups beyond backupCount
   */
  public doRollover(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;

      const dateStr = new Date().toISOString().split('T')[0];
      const nextBackupPath = this.getNextBackupPath(dateStr);

      // Enforce backupCount limit by removing oldest backups first
      if (this.backupCount > 0) {
        const existingBackups = this.getExistingBackups();
        while (existingBackups.length >= this.backupCount) {
          const oldest = existingBackups.shift();
          if (oldest && fs.existsSync(oldest.filePath)) {
            fs.unlinkSync(oldest.filePath);
          }
        }
      }

      // Rename current activity.log to the sequence backup
      fs.renameSync(this.logFilePath, nextBackupPath);
    } catch {
      // Ignore rotation errors to avoid disrupting runtime execution
    }
  }

  private getNextBackupPath(dateStr: string): string {
    const backupRegex = new RegExp(`^activity_${dateStr}_(\\d+)\\.log$`);
    let maxSeq = 0;

    if (fs.existsSync(this.logDir)) {
      const entries = fs.readdirSync(this.logDir);
      for (const entry of entries) {
        const match = entry.match(backupRegex);
        if (match) {
          const seq = Number.parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    return path.join(this.logDir, `activity_${dateStr}_${nextSeq}.log`);
  }

  private getExistingBackups(): Array<{ filePath: string; mtime: number }> {
    const backupRegex = /^activity_(\d{4}-\d{2}-\d{2})_(\d+)\.log$/;
    const backups: Array<{ filePath: string; mtime: number }> = [];

    if (!fs.existsSync(this.logDir)) return backups;

    const entries = fs.readdirSync(this.logDir);
    for (const entry of entries) {
      if (entry === DEFAULT_LOG_FILENAME) continue;
      if (backupRegex.test(entry)) {
        const fullPath = path.join(this.logDir, entry);
        try {
          const stat = fs.statSync(fullPath);
          backups.push({ filePath: fullPath, mtime: stat.mtimeMs });
        } catch {
          // ignore
        }
      }
    }

    // Sort from oldest to newest
    backups.sort((a, b) => a.mtime - b.mtime);
    return backups;
  }
}
