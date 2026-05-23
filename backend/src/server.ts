import http from 'http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSockets } from './sockets';
import { app } from './app';

const server = http.createServer(app);
initSockets(server);

server.listen(env.PORT, () => {
  logger.info(`PlowPath API listening on :${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal: string) => () => {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
