/**
 * Email Client - Nodemailer configuration
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { emailLogger } from '../utils/logger.js';

let transporter: Transporter | null = null;

/**
 * Get SMTP configuration from environment
 */
function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
}

/**
 * Initialize email transporter
 */
export function initTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const config = getSmtpConfig();

  if (!config.auth.user || !config.auth.pass) {
    emailLogger.warn('SMTP credentials not configured, email sending will be disabled');
    // Create a fake transporter that logs instead of sending
    const fakeTransporter = {
      sendMail: async (options: any) => {
        emailLogger.info('Email would be sent (SMTP not configured)', {
          to: options.to,
          subject: options.subject,
        });
        return { messageId: 'fake-' + Date.now() };
      },
    } as Transporter;
    transporter = fakeTransporter;
    return fakeTransporter;
  }

  transporter = nodemailer.createTransport(config);

  emailLogger.info('Email transporter initialized', {
    host: config.host,
    port: config.port,
  });

  return transporter;
}

/**
 * Get email transporter
 */
export function getTransporter(): Transporter {
  if (!transporter) {
    return initTransporter();
  }
  return transporter;
}

/**
 * Get sender address
 */
export function getSenderAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@example.com';
}

/**
 * Verify transporter connection
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    if (typeof transport.verify === 'function') {
      await transport.verify();
      emailLogger.info('Email connection verified');
      return true;
    }
    return true; // Fake transporter
  } catch (error) {
    emailLogger.error('Email connection verification failed', error);
    return false;
  }
}

/**
 * Send email
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transport = getTransporter();
  const from = getSenderAddress();

  try {
    emailLogger.info('Sending email', { to: options.to, subject: options.subject });

    const result = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    emailLogger.info('Email sent', { messageId: result.messageId });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    emailLogger.error('Failed to send email', error, { to: options.to });
    return { success: false, error: errorMessage };
  }
}

/**
 * Close transporter
 */
export function closeTransporter(): void {
  if (transporter && typeof transporter.close === 'function') {
    transporter.close();
    transporter = null;
    emailLogger.info('Email transporter closed');
  }
}
