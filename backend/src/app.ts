import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env, corsOrigins } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRateLimit } from './middleware/rateLimit.middleware';
import { query } from './config/db';
import { redis } from './config/redis';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import driverRoutes from './routes/drivers.routes';
import customerRoutes from './routes/customers.routes';
import stormRoutes from './routes/storms.routes';
import routeRoutes from './routes/routes.routes';
import trackingRoutes from './routes/tracking.routes';
import twilioRoutes from './routes/twilio.routes';
import signRoutes from './routes/signs.routes';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  {
    skip: (req) => !!(req.originalUrl && req.originalUrl.startsWith('/health')),
  }
));

// Health Checks
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() });
});

app.get('/health/db', async (_req: Request, res: Response) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', db: 'disconnected', error: message });
  }
});

app.get('/health/redis', async (_req: Request, res: Response) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', redis: 'disconnected', error: message });
  }
});

app.get('/health/twilio', async (_req: Request, res: Response) => {
  try {
    const isConfigured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
    if (!isConfigured) {
      return res.status(200).json({ status: 'mocked', twilio: 'mock_mode_active', details: 'Twilio keys missing; running in dry-run mode.' });
    }
    // Verify outbound API reachability to Twilio gateway
    const axios = require('axios');
    const response = await axios.get('https://api.twilio.com', { timeout: 3000 });
    res.json({ status: 'ok', twilio: 'connected', apiStatus: response.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', twilio: 'unreachable', error: message });
  }
});

// API Routes
app.use('/api/v1', apiRateLimit);

// Lightweight Route Discovery
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
      },
      users: {
        me: 'GET /api/v1/users/me',
      },
      drivers: {
        list: 'GET /api/v1/drivers',
        getOne: 'GET /api/v1/drivers/:id',
        create: 'POST /api/v1/drivers',
        update: 'PUT /api/v1/drivers/:id',
        remove: 'DELETE /api/v1/drivers/:id',
      },
      customers: {
        list: 'GET /api/v1/customers',
        getOne: 'GET /api/v1/customers/:id',
        create: 'POST /api/v1/customers',
        update: 'PUT /api/v1/customers/:id',
        remove: 'DELETE /api/v1/customers/:id',
      },
      storms: {
        list: 'GET /api/v1/storms',
        getOne: 'GET /api/v1/storms/:id',
        create: 'POST /api/v1/storms',
        update: 'PUT /api/v1/storms/:id',
        remove: 'DELETE /api/v1/storms/:id',
      },
      routes: {
        list: 'GET /api/v1/routes',
        getOne: 'GET /api/v1/routes/:id',
        generate: 'POST /api/v1/routes/generate',
        updateStop: 'PUT /api/v1/routes/:id/stops/:stopId',
        update: 'PUT /api/v1/routes/:id',
      },
      tracking: {
        ingest: 'POST /api/v1/tracking',
        latest: 'GET /api/v1/tracking/latest',
        driverHistory: 'GET /api/v1/tracking/driver/:id',
      },
    },
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/storms', stormRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/webhooks/twilio', twilioRoutes);
app.use('/api/v1/signs', signRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
});

app.use(errorMiddleware);

export { app };
