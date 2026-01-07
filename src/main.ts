#!/usr/bin/env node

/**
 * AI Marketing Agent - Main Entry Point
 *
 * This is the main entry point for the autonomous AI Marketing Agent.
 * It initializes and starts all agent components:
 * - Database (SQLite)
 * - HTTP Server (Express)
 * - Scheduler (node-cron)
 * - Email Service (Nodemailer)
 * - AI Brain (Claude API)
 */

import 'dotenv/config';
import { startAgent } from './agent/index.js';
import { agentLogger } from './utils/logger.js';

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     █████╗ ██╗    ███╗   ███╗ █████╗ ██████╗ ██╗  ██╗    ║
║    ██╔══██╗██║    ████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝    ║
║    ███████║██║    ██╔████╔██║███████║██████╔╝█████╔╝     ║
║    ██╔══██║██║    ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗     ║
║    ██║  ██║██║    ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗    ║
║    ╚═╝  ╚═╝╚═╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ║
║                                                           ║
║            AI Marketing Agent for Facebook                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  console.log(banner);

  agentLogger.info('Starting AI Marketing Agent...');

  // Check required environment variables
  const requiredEnvVars = [
    'ANTHROPIC_API_KEY',
    'FACEBOOK_PAGE_ID',
    'FACEBOOK_ACCOUNT_ID',
    'FACEBOOK_ACCESS_TOKEN',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    agentLogger.warn(
      `Missing environment variables: ${missingVars.join(', ')}. Some features may not work.`
    );
  }

  // Check optional but recommended env vars
  const recommendedEnvVars = ['SMTP_HOST', 'SMTP_USER', 'EMAIL_TO'];

  const missingRecommended = recommendedEnvVars.filter((varName) => !process.env[varName]);

  if (missingRecommended.length > 0) {
    agentLogger.warn(
      `Missing recommended variables: ${missingRecommended.join(', ')}. Email notifications will not work.`
    );
  }

  try {
    await startAgent();

    agentLogger.info('Agent is running. Press Ctrl+C to stop.');
  } catch (error) {
    agentLogger.error('Failed to start agent:', error);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
