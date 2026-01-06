/**
 * HTTP Server - Express application
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import webhookRoutes from './routes/webhook.js';
import apiRoutes from './routes/api.js';
import { serverLogger } from '../utils/logger.js';

let app: Express | null = null;
let server: any = null;

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  if (app) return app;

  app = express();

  // CORS - allow all origins for webhooks
  app.use(cors());

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for dashboard
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    serverLogger.http(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Basic auth for dashboard (optional)
  const dashboardUser = process.env.DASHBOARD_USER;
  const dashboardPass = process.env.DASHBOARD_PASS;

  if (dashboardUser && dashboardPass) {
    app.use('/dashboard', (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;

      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"');
        return res.status(401).send('Authentication required');
      }

      const credentials = Buffer.from(auth.slice(6), 'base64').toString();
      const [user, pass] = credentials.split(':');

      if (user === dashboardUser && pass === dashboardPass) {
        next();
      } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"');
        return res.status(401).send('Invalid credentials');
      }
    });

    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;

      if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const credentials = Buffer.from(auth.slice(6), 'base64').toString();
      const [user, pass] = credentials.split(':');

      if (user === dashboardUser && pass === dashboardPass) {
        next();
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  }

  // Routes
  app.use('/webhook', webhookRoutes);
  app.use('/api', apiRoutes);

  // Static files for dashboard
  const dashboardPath = join(process.cwd(), 'dashboard');
  app.use('/dashboard', express.static(dashboardPath));

  // Dashboard root redirect
  app.get('/', (req: Request, res: Response) => {
    res.redirect('/dashboard');
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    serverLogger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/**
 * Start the HTTP server
 */
export function startServer(port?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const application = createApp();
    const serverPort = port || parseInt(process.env.PORT || '3000', 10);
    const serverHost = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

    server = application.listen(serverPort, serverHost, () => {
      serverLogger.info(`Server started on ${serverHost}:${serverPort}`);
      resolve(serverPort);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        serverLogger.error(`Port ${serverPort} is already in use`);
      }
      reject(error);
    });
  });
}

/**
 * Stop the HTTP server
 */
export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        serverLogger.info('Server stopped');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Get the Express app instance
 */
export function getApp(): Express | null {
  return app;
}

/**
 * Check if server is running
 */
export function isServerRunning(): boolean {
  return server !== null;
}
