/**
 * AI Marketing Agent - Main Agent Module
 */

import { initDatabase, closeDatabase } from '../database/index.js';
import { getConfig, initConfigFromEnv } from '../database/repositories/config.js';
import { startServer, stopServer } from '../server/index.js';
import { startScheduler, stopScheduler } from '../scheduler/tasks/index.js';
import { initTransporter, closeTransporter, verifyConnection } from '../email/client.js';
import { healthCheck as aiHealthCheck } from '../ai/brain.js';
import { logSystemEvent } from '../database/repositories/audit.js';
import { agentLogger } from '../utils/logger.js';

interface AgentStatus {
  running: boolean;
  startedAt: Date | null;
  database: boolean;
  server: boolean;
  scheduler: boolean;
  email: boolean;
  ai: boolean;
}

let status: AgentStatus = {
  running: false,
  startedAt: null,
  database: false,
  server: false,
  scheduler: false,
  email: false,
  ai: false,
};

/**
 * Initialize the agent
 */
export async function initAgent(): Promise<void> {
  agentLogger.info('Initializing AI Marketing Agent...');

  try {
    // Initialize database
    agentLogger.info('Initializing database...');
    initDatabase();
    status.database = true;

    // Initialize configuration
    agentLogger.info('Loading configuration...');
    let config = getConfig();
    if (!config) {
      agentLogger.info('No configuration found, creating from environment...');
      config = initConfigFromEnv();
    }
    agentLogger.info(`Agent configured: ${config.name}`);

    // Initialize email
    agentLogger.info('Initializing email service...');
    initTransporter();
    status.email = await verifyConnection();
    if (!status.email) {
      agentLogger.warn('Email service not available (check SMTP configuration)');
    }

    // Check AI connection
    agentLogger.info('Checking AI connection...');
    status.ai = await aiHealthCheck();
    if (!status.ai) {
      agentLogger.warn('AI service not available (check ANTHROPIC_API_KEY)');
    }

    logSystemEvent('Agent initialized', {
      database: status.database,
      email: status.email,
      ai: status.ai,
    });

    agentLogger.info('Agent initialization complete');
  } catch (error) {
    agentLogger.error('Failed to initialize agent', error);
    throw error;
  }
}

/**
 * Start the agent
 */
export async function startAgent(): Promise<void> {
  if (status.running) {
    agentLogger.warn('Agent is already running');
    return;
  }

  agentLogger.info('Starting AI Marketing Agent...');

  try {
    // Initialize if not already done
    if (!status.database) {
      await initAgent();
    }

    // Start HTTP server
    agentLogger.info('Starting HTTP server...');
    const port = await startServer();
    status.server = true;
    agentLogger.info(`HTTP server running on port ${port}`);

    // Start scheduler
    agentLogger.info('Starting scheduler...');
    startScheduler();
    status.scheduler = true;
    agentLogger.info('Scheduler started');

    status.running = true;
    status.startedAt = new Date();

    logSystemEvent('Agent started', {
      port,
      scheduler: true,
    });

    const config = getConfig();
    const baseUrl = process.env.BASE_URL || `http://0.0.0.0:${port}`;
    agentLogger.info(`AI Marketing Agent "${config?.name || 'Unknown'}" is now running`);
    agentLogger.info(`Dashboard: ${baseUrl}/dashboard`);
  } catch (error) {
    agentLogger.error('Failed to start agent', error);
    await stopAgent();
    throw error;
  }
}

/**
 * Stop the agent
 */
export async function stopAgent(): Promise<void> {
  agentLogger.info('Stopping AI Marketing Agent...');

  try {
    // Stop scheduler
    if (status.scheduler) {
      stopScheduler();
      status.scheduler = false;
    }

    // Stop HTTP server
    if (status.server) {
      await stopServer();
      status.server = false;
    }

    // Close email transport
    closeTransporter();
    status.email = false;

    // Close database
    if (status.database) {
      closeDatabase();
      status.database = false;
    }

    status.running = false;
    status.startedAt = null;
    status.ai = false;

    agentLogger.info('Agent stopped');
  } catch (error) {
    agentLogger.error('Error stopping agent', error);
    throw error;
  }
}

/**
 * Get agent status
 */
export function getAgentStatus(): AgentStatus & { uptime: number } {
  return {
    ...status,
    uptime: status.startedAt ? Date.now() - status.startedAt.getTime() : 0,
  };
}

/**
 * Check if agent is healthy
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
}> {
  const checks = {
    database: status.database,
    server: status.server,
    scheduler: status.scheduler,
    email: status.email,
    ai: status.ai,
  };

  // Recheck AI if needed
  if (!checks.ai && status.running) {
    checks.ai = await aiHealthCheck();
    status.ai = checks.ai;
  }

  // Recheck email if needed
  if (!checks.email && status.running) {
    checks.email = await verifyConnection();
    status.email = checks.email;
  }

  const healthy = checks.database && checks.server;

  return { healthy, checks };
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  agentLogger.info('Received SIGTERM signal');
  await stopAgent();
  process.exit(0);
});

process.on('SIGINT', async () => {
  agentLogger.info('Received SIGINT signal');
  await stopAgent();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  agentLogger.error('Uncaught exception', error);
  await stopAgent();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  agentLogger.error('Unhandled rejection', reason as Error);
});
