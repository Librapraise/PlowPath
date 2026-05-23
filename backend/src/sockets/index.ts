import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env, corsOrigins } from '../config/env';
import { logger } from '../utils/logger';
import type { AuthPayload } from '../middleware/auth.middleware';

let io: SocketIOServer | null = null;

export interface GpsUpdatePayload {
  driver_id: string;
  route_id: string | null;
  lat: number;
  lon: number;
  recorded_at: string;
}

const DASHBOARD_ROOM = 'dashboard';

export function initSockets(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    path: '/socket.io',
  });

  // JWT handshake — the same access token the REST API uses.
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as { token?: string } | undefined)?.token ??
      (socket.handshake.query.token as string | undefined);
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      (socket.data as { user: AuthPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket.data as { user: AuthPayload }).user;
    logger.info('socket connected: user=%s role=%s', user.sub, user.role);

    if (user.role === 'driver' && user.driverId) {
      void socket.join(`driver:${user.driverId}`);
    } else {
      void socket.join(DASHBOARD_ROOM);
    }

    // Drivers may push GPS via WS instead of REST — useful for low-latency live tracking.
    socket.on('gps:update', (payload: Omit<GpsUpdatePayload, 'driver_id'>) => {
      if (user.role !== 'driver' || !user.driverId) return;
      broadcastGpsUpdate({ ...payload, driver_id: user.driverId });
    });

    socket.on('disconnect', (reason) => {
      logger.info('socket disconnected: user=%s reason=%s', user.sub, reason);
    });
  });

  return io;
}

export function broadcastGpsUpdate(update: GpsUpdatePayload): void {
  if (!io) return;
  io.to(DASHBOARD_ROOM).emit('gps:update', update);
}
