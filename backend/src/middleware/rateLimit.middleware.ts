import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

// 100 req/min per IP+user. Per the PRD non-functional requirements.
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1) as any) as any,
    prefix: 'rl:api:',
  }),
  keyGenerator: (req) => (req.user?.sub ? `u:${req.user.sub}` : `ip:${req.ip}`),
});

// Stricter limit on auth endpoints to deter credential stuffing (5 / 15 min).
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1) as any) as any,
    prefix: 'rl:auth:',
  }),
});
