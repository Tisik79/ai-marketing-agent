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

export function registerTask(
  name: string,
  cronExpression: string,
  handler: () => Promise<void> | void,
  options?: { timezone?: string; runOnStart?: boolean }
): void {
  if (tasks.has(name)) {
    stopTask(name);
  }

  const wrappedHandler = async () => {
    const startTime = Date.now();
    schedulerLogger.info(`Running task: ${name}`);
    try {
      await handler();
      schedulerLogger.info(`Task completed: ${name}`, { duration: `${Date.now() - startTime}ms` });
    } catch (error) {
      schedulerLogger.error(`Task failed: ${name}`, error);
    }
  };

  const scheduleOptions = {
    scheduled: false,
    timezone: options?.timezone || 'Europe/Prague',
  };
  const task = cron.schedule(cronExpression, wrappedHandler, scheduleOptions as any);

  tasks.set(name, { name, schedule: cronExpression, task, enabled: false });
  schedulerLogger.info(`Registered task: ${name}`, { schedule: cronExpression });

  if (options?.runOnStart) {
    wrappedHandler();
  }
}

export function startTask(name: string): boolean {
  const scheduled = tasks.get(name);
  if (!scheduled) return false;
  scheduled.task.start();
  scheduled.enabled = true;
  return true;
}

export function stopTask(name: string): boolean {
  const scheduled = tasks.get(name);
  if (!scheduled) return false;
  scheduled.task.stop();
  scheduled.enabled = false;
  return true;
}

export function startAllTasks(): void {
  for (const [name] of tasks) startTask(name);
}

export function stopAllTasks(): void {
  for (const [name] of tasks) stopTask(name);
}

export function listTasks(): Array<{ name: string; schedule: string; enabled: boolean }> {
  return Array.from(tasks.values()).map(({ name, schedule, enabled }) => ({ name, schedule, enabled }));
}

export function hasTask(name: string): boolean { return tasks.has(name); }

export function clearAllTasks(): void {
  stopAllTasks();
  tasks.clear();
}
