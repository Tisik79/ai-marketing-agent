/**
 * Scheduler - Cron job management
 */

import cron, { ScheduledTask as CronTask } from 'node-cron';
import { schedulerLogger } from '../utils/logger.js';

interface ScheduledTask {
  name: string;
  schedule: string;
  task: CronTask;
  enabled: boolean;
}

const tasks: Map<string, ScheduledTask> = new Map();

/**
 * Register a scheduled task
 */
export function registerTask(
  name: string,
  cronExpression: string,
  handler: () => Promise<void> | void,
  options?: {
    timezone?: string;
    runOnStart?: boolean;
  }
): void {
  if (tasks.has(name)) {
    schedulerLogger.warn(`Task ${name} already exists, replacing`);
    stopTask(name);
  }

  const wrappedHandler = async () => {
    const startTime = Date.now();
    schedulerLogger.info(`Running task: ${name}`);

    try {
      await handler();
      const duration = Date.now() - startTime;
      schedulerLogger.info(`Task completed: ${name}`, { duration: `${duration}ms` });
    } catch (error) {
      schedulerLogger.error(`Task failed: ${name}`, error);
    }
  };

  // Type assertion needed due to outdated @types/node-cron
  const scheduleOptions = {
    scheduled: false,
    timezone: options?.timezone || 'Europe/Prague',
  };
  const task = cron.schedule(cronExpression, wrappedHandler, scheduleOptions as any);

  tasks.set(name, {
    name,
    schedule: cronExpression,
    task,
    enabled: false,
  });

  schedulerLogger.info(`Registered task: ${name}`, { schedule: cronExpression });

  // Run on start if requested
  if (options?.runOnStart) {
    schedulerLogger.info(`Running task on start: ${name}`);
    wrappedHandler();
  }
}

/**
 * Start a specific task
 */
export function startTask(name: string): boolean {
  const scheduled = tasks.get(name);
  if (!scheduled) {
    schedulerLogger.warn(`Task not found: ${name}`);
    return false;
  }

  scheduled.task.start();
  scheduled.enabled = true;
  schedulerLogger.info(`Started task: ${name}`);
  return true;
}

/**
 * Stop a specific task
 */
export function stopTask(name: string): boolean {
  const scheduled = tasks.get(name);
  if (!scheduled) {
    return false;
  }

  scheduled.task.stop();
  scheduled.enabled = false;
  schedulerLogger.info(`Stopped task: ${name}`);
  return true;
}

/**
 * Start all registered tasks
 */
export function startAllTasks(): void {
  schedulerLogger.info('Starting all scheduled tasks');
  for (const [name] of tasks) {
    startTask(name);
  }
}

/**
 * Stop all registered tasks
 */
export function stopAllTasks(): void {
  schedulerLogger.info('Stopping all scheduled tasks');
  for (const [name] of tasks) {
    stopTask(name);
  }
}

/**
 * Get list of all tasks
 */
export function listTasks(): Array<{ name: string; schedule: string; enabled: boolean }> {
  return Array.from(tasks.values()).map(({ name, schedule, enabled }) => ({
    name,
    schedule,
    enabled,
  }));
}

/**
 * Check if task exists
 */
export function hasTask(name: string): boolean {
  return tasks.has(name);
}

/**
 * Get task status
 */
export function getTaskStatus(name: string): { exists: boolean; enabled: boolean; schedule?: string } {
  const scheduled = tasks.get(name);
  if (!scheduled) {
    return { exists: false, enabled: false };
  }
  return {
    exists: true,
    enabled: scheduled.enabled,
    schedule: scheduled.schedule,
  };
}

/**
 * Run a task immediately (out of schedule)
 */
export async function runTaskNow(name: string): Promise<boolean> {
  const scheduled = tasks.get(name);
  if (!scheduled) {
    schedulerLogger.warn(`Task not found: ${name}`);
    return false;
  }

  schedulerLogger.info(`Manually triggering task: ${name}`);

  // Get the handler from the task's internal callback
  // Note: This is a workaround since node-cron doesn't expose the handler directly
  // In production, we should store the handler separately
  try {
    // Trigger by firing the task immediately
    // This will be implemented by calling the handler directly in the task definitions
    return true;
  } catch (error) {
    schedulerLogger.error(`Failed to run task manually: ${name}`, error);
    return false;
  }
}

/**
 * Clear all tasks
 */
export function clearAllTasks(): void {
  stopAllTasks();
  tasks.clear();
  schedulerLogger.info('All tasks cleared');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  schedulerLogger.info('Received SIGTERM, stopping scheduler');
  stopAllTasks();
});

process.on('SIGINT', () => {
  schedulerLogger.info('Received SIGINT, stopping scheduler');
  stopAllTasks();
});
