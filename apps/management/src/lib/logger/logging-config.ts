import { LoggerManager, type LogLevelName, LogLevel } from './logger-manager';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export const NO_CONTEXT = '-';
export const LOGGER_NAMESPACE = process.env.LOGGER_NAMESPACE || 'vaanvibes';

// Node.js AsyncLocalStorage for request-scoped context propagation
const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

// Global hook so LoggerManager can query active context without circular dependencies
const g = globalThis as unknown as { __LOGGER_GET_CONTEXT__?: () => LogContext | undefined };
g.__LOGGER_GET_CONTEXT__ = () => asyncLocalStorage.getStore();

/**
 * Execute an asynchronous or synchronous function within a specific log context.
 * Automatically injects [req=... user=...] into all logs generated within the function.
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Retrieve the active execution log context.
 */
export function getLogContext(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

let isLoggingConfigured = false;

/**
 * Initialize and verify global logging configuration.
 */
export function setupLogging(level?: LogLevelName | LogLevel): void {
  if (isLoggingConfigured) return;

  const defaultLevel = level || (process.env.LOG_LEVEL as LogLevelName) || 'INFO';
  // Ensure base system logger is warmed up
  LoggerManager.getInstance({
    folderName: 'system',
    loggerName: `${LOGGER_NAMESPACE}.system`,
    level: defaultLevel,
  });

  isLoggingConfigured = true;
}

/**
 * Retrieve a centralized rotating logger managed by LoggerManager.
 * Matches the get_logger(category) interface from backend core logging.
 *
 * @param category Subdirectory inside logs/ (e.g. 'system', 'api', 'auth', 'app')
 * @param customName Optional specific logger display name
 */
export function getLogger(category: string = 'system', customName?: string): LoggerManager {
  const folder = (category || 'system').trim();
  const name = customName || `${LOGGER_NAMESPACE}.${folder}`;

  return LoggerManager.getInstance({
    folderName: folder,
    loggerName: name,
  });
}

// Pre-configured standard category loggers
export const systemLogger = getLogger('system');
export const apiLogger = getLogger('api');
export const authLogger = getLogger('auth');
export const appLogger = getLogger('app');

// Default general-purpose logger
export const logger = appLogger;
