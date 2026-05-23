jest.mock('@turf/turf', () => ({
  point: (coords: number[]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: coords } }),
  distance: (from: any, to: any, options?: any) => {
    const [lon1, lat1] = from.geometry.coordinates;
    const [lon2, lat2] = to.geometry.coordinates;
    return Math.sqrt((lon1 - lon2) ** 2 + (lat1 - lat2) ** 2) * 69;
  },
}));

import request from 'supertest';
import { app } from '../app';
import { query } from '../config/db';
import { redis } from '../config/redis';

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

jest.mock('../middleware/rateLimit.middleware', () => ({
  apiRateLimit: (req: any, res: any, next: any) => next(),
  authRateLimit: (req: any, res: any, next: any) => next(),
}));

describe('PlowPath API E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 ok and environment state', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          env: expect.any(String),
          time: expect.any(String),
        })
      );
    });
  });

  describe('GET /health/db', () => {
    it('should return 200 ok if database is connected', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/health/db');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', db: 'connected' });
    });

    it('should return 503 error if database is offline', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('Connection timed out'));
      const res = await request(app).get('/health/db');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: 'error',
        db: 'disconnected',
        error: 'Connection timed out',
      });
    });
  });

  describe('GET /health/redis', () => {
    it('should return 200 ok if redis is connected', async () => {
      (redis.ping as jest.Mock).mockResolvedValueOnce('PONG');
      const res = await request(app).get('/health/redis');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', redis: 'connected' });
    });

    it('should return 503 error if redis is offline', async () => {
      (redis.ping as jest.Mock).mockRejectedValueOnce(new Error('Redis connection lost'));
      const res = await request(app).get('/health/redis');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: 'error',
        redis: 'disconnected',
        error: 'Redis connection lost',
      });
    });
  });

  describe('GET /api/v1', () => {
    it('should return lightweight routing endpoints map', async () => {
      const res = await request(app).get('/api/v1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          endpoints: expect.any(Object),
        })
      );
    });
  });
});
