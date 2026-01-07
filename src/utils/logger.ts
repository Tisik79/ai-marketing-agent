/**
 * Winston Logger Configuration
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, component, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  if (component) {
    msg += ` [${component}]`;
  }
  msg += ` ${message}`;

  // Add metadata if present
  const metaKeys = Object.keys(metadata).filter(k => k !== 'stack');
  if (metaKeys.length > 0) {
    const metaStr = metaKeys.map(k => `${k}=${JSON.stringify(metadata[k])}`).join(' ');
    msg += ` ${metaStr}`;
  }

  // Add stack trace for errors
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }

  return msg;
});

// Create base logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
});

// Add file transport if LOG_FILE is set
if (process.env.LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

/**
 * Create a child logger with component name
 */
function createComponentLogger(component: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { component, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { component, ...meta }),
    error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
      const errorMeta: Record<string, unknown> = { component, ...meta };
      if (error instanceof Error) {
        errorMeta.stack = error.stack;
        errorMeta.errorMessage = error.message;
      } else if (error) {
        errorMeta.errorMessage = String(error);
      }
      logger.error(message, errorMeta);
    },
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { component, ...meta }),
    http: (message: string, meta?: Record<string, unknown>) =>
      logger.http(message, { component, ...meta }),
  };
}

// Export component loggers
export const agentLogger = createComponentLogger('Agent');
export const dbLogger = createComponentLogger('Database');
export const aiLogger = createComponentLogger('AI');
export const emailLogger = createComponentLogger('Email');
export const schedulerLogger = createComponentLogger('Scheduler');
export const serverLogger = createComponentLogger('Server');
export const approvalLogger = createComponentLogger('Approval');

// Export base logger for general use
export default logger;
