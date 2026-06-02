import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  keepAlive: 30000,
  lazyConnect: process.env.NODE_ENV === 'test',
});

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis error', err);
});

export function getBullOptions() {
  return {
    createClient: (type: 'client' | 'subscriber' | 'bclient') => {
      const client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        keepAlive: 30000,
        lazyConnect: process.env.NODE_ENV === 'test',
      });

      client.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(`Bull Redis client (${type}) error`, err);
      });

      return client;
    },
  };
}
