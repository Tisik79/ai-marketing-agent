/**
 * Logger Module - Winston-based logging
 */

import winston from 'winston';
import { join } from 'path';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
function getLogLevel(): string {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : process.env.LOG_LEVEL || 'info';
}

// Custom format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for files
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Get log directory
function getLogDir(): string {
  return process.env.LOG_DIR || join(process.cwd(), 'logs');
}

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logDir = getLogDir();

  transports.push(
    // Error log
    new winston.transports.File({
      filename: join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log
    new winston.transports.File({
      filename: join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports,
  exitOnError: false,
});

// Helper functions for structured logging
export function logInfo(message: string, meta?: Record<string, any>): void {
  logger.info(message, meta);
}

export function logError(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
  const errorMeta = error instanceof Error
    ? { error: error.message, stack: error.stack, ...meta }
    : { error: String(error), ...meta };
  logger.error(message, errorMeta);
}

export function logWarn(message: string, meta?: Record<string, any>): void {
  logger.warn(message, meta);
}

export function logDebug(message: string, meta?: Record<string, any>): void {
  logger.debug(message, meta);
}

export function logHttp(message: string, meta?: Record<string, any>): void {
  logger.http(message, meta);
}

// Component-specific loggers
export function createComponentLogger(component: string) {
  return {
    info: (message: string, meta?: Record<string, any>) =>
      logInfo(`[${component}] ${message}`, meta),
    error: (message: string, error?: Error | unknown, meta?: Record<string, any>) =>
      logError(`[${component}] ${message}`, error, meta),
    warn: (message: string, meta?: Record<string, any>) =>
      logWarn(`[${component}] ${message}`, meta),
    debug: (message: string, meta?: Record<string, any>) =>
      logDebug(`[${component}] ${message}`, meta),
    http: (message: string, meta?: Record<string, any>) =>
      logHttp(`[${component}] ${message}`, meta),
  };
}

// Pre-configured component loggers
export const agentLogger = createComponentLogger('Agent');
export const dbLogger = createComponentLogger('Database');
export const aiLogger = createComponentLogger('AI');
export const emailLogger = createComponentLogger('Email');
export const schedulerLogger = createComponentLogger('Scheduler');
export const serverLogger = createComponentLogger('Server');
export const approvalLogger = createComponentLogger('Approval');

// Export the main logger instance
export default logger;
