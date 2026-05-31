import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool, query } from '../config/db';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { getIo } from '../sockets';

const heartbeatSchema = z.object({
  is_moving: z.boolean(),
  battery_level: z.number().min(0).max(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const handoverSchema = z.object({
  qrToken: z.string().min(1),
});

export async function startShift(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  if (req.user.role !== 'driver' || !req.user.driverId) {
    throw HttpError.forbidden('Only drivers can start shifts');
  }

  // Check if there is already an active shift for this driver
  const activeShift = await query(
    `SELECT id FROM driver_shifts 
      WHERE driver_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [req.user.driverId],
  );

  if (activeShift.rows.length > 0) {
    res.json(activeShift.rows[0]);
    return;
  }

  const { rows } = await query(
    `INSERT INTO driver_shifts (driver_id, org_id, status)
     VALUES ($1, $2, 'active')
     RETURNING id, driver_id, org_id, started_at, last_heartbeat_at, break_duration_seconds, cumulative_active_seconds, status`,
    [req.user.driverId, req.user.orgId],
  );

  res.status(201).json(rows[0]);
}

export async function endShift(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  if (req.user.role !== 'driver' || !req.user.driverId) {
    throw HttpError.forbidden('Only drivers can end shifts');
  }

  const activeShift = await query<{ id: string; started_at: Date }>(
    `SELECT id, started_at FROM driver_shifts 
      WHERE driver_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [req.user.driverId],
  );

  if (activeShift.rows.length === 0) {
    throw HttpError.notFound('No active shift found to end');
  }

  const shiftId = activeShift.rows[0].id;
  const elapsedSeconds = Math.floor((Date.now() - new Date(activeShift.rows[0].started_at).getTime()) / 1000);

  const { rows } = await query(
    `UPDATE driver_shifts 
        SET status = 'ended', ended_at = NOW(), cumulative_active_seconds = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, driver_id, org_id, started_at, ended_at, break_duration_seconds, cumulative_active_seconds, status`,
    [elapsedSeconds, shiftId],
  );

  res.json(rows[0]);
}

export async function logHeartbeat(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  if (req.user.role !== 'driver' || !req.user.driverId) {
    throw HttpError.forbidden('Only drivers can record shift heartbeats');
  }

  const body = heartbeatSchema.parse(req.body);

  const activeShift = await query<{ id: string }>(
    `SELECT id FROM driver_shifts 
      WHERE driver_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [req.user.driverId],
  );

  if (activeShift.rows.length === 0) {
    throw HttpError.notFound('No active shift found. Please start a shift first.');
  }

  const shiftId = activeShift.rows[0].id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert heartbeat log
    const gpsPoint = `SRID=4326;POINT(${body.longitude} ${body.latitude})`;
    await client.query(
      `INSERT INTO driver_shift_heartbeats (shift_id, is_moving, battery_level, gps_coordinates)
       VALUES ($1, $2, $3, ST_GeomFromEWKT($4))`,
      [shiftId, body.is_moving, body.battery_level ?? null, gpsPoint],
    );

    // 2. Update last heartbeat timestamp on the shift
    const shiftRes = await client.query(
      `UPDATE driver_shifts 
          SET last_heartbeat_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id, driver_id, org_id, started_at, last_heartbeat_at, cumulative_active_seconds, status`,
      [shiftId],
    );

    // 3. Optional: Broadcast to LiveOps dashboard room
    const ioServer = getIo();
    if (ioServer) {
      ioServer.to('dashboard').emit('driver:telemetry', {
        driverId: req.user.driverId,
        shiftId,
        latitude: body.latitude,
        longitude: body.longitude,
        is_moving: body.is_moving,
        battery_level: body.battery_level,
        recorded_at: new Date().toISOString(),
      });
    }

    await client.query('COMMIT');
    res.json(shiftRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function handleShiftHandover(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const replacementDriverId = req.user.driverId;
  const orgId = req.user.orgId;

  if (!replacementDriverId) {
    throw HttpError.forbidden('Only drivers can perform shifts handover');
  }

  const { qrToken } = handoverSchema.parse(req.body);

  let decoded: any;
  try {
    decoded = jwt.verify(qrToken, env.JWT_SECRET);
  } catch (err) {
    throw HttpError.unauthorized('Invalid or expired handover token.');
  }

  if (decoded.sub !== 'driver_shift_handover') {
    throw HttpError.badRequest('Invalid handover token type.');
  }

  const currentShift = await query(
    `SELECT * FROM driver_shifts WHERE id = $1 AND org_id = $2 AND status = 'active'`,
    [decoded.shiftId, orgId],
  );

  if (currentShift.rows.length === 0) {
    throw HttpError.notFound('Active shift not found or mismatching organization.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. End old shift
    await client.query(
      `UPDATE driver_shifts SET status = 'ended', ended_at = NOW() WHERE id = $1`,
      [decoded.shiftId],
    );

    // 2. Start new shift for replacement driver
    const newShiftRes = await client.query<{ id: string }>(
      `INSERT INTO driver_shifts (driver_id, org_id, status) VALUES ($1, $2, 'active') RETURNING id`,
      [replacementDriverId, orgId],
    );
    const newShiftId = newShiftRes.rows[0].id;

    // 3. Reassign route driver
    await client.query(
      `UPDATE routes SET driver_id = $1 WHERE id = $2`,
      [replacementDriverId, decoded.routeId],
    );

    await client.query('COMMIT');

    // Broadcast update via socket
    const ioServer = getIo();
    if (ioServer) {
      ioServer.to('dashboard').emit('shift:handover', {
        routeId: decoded.routeId,
        oldShiftId: decoded.shiftId,
        newShiftId,
        newDriverId: replacementDriverId,
      });
    }

    res.json({
      message: 'Handover completed successfully.',
      newShiftId,
      routeId: decoded.routeId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getActiveShiftInfo(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const driverId = req.user.driverId;

  if (!driverId) {
    throw HttpError.forbidden('Only drivers can retrieve active shifts');
  }

  const { rows } = await query(
    `SELECT * FROM driver_shifts 
      WHERE driver_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [driverId],
  );

  if (rows.length === 0) {
    res.json(null);
  } else {
    res.json(rows[0]);
  }
}

export async function listActiveShifts(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  // Dashboard dispatchers want to view active shifts within their org
  const { rows } = await query(
    `SELECT ds.*, d.name as driver_name, d.phone as driver_phone
       FROM driver_shifts ds
       JOIN drivers d ON d.driver_id = ds.driver_id
      WHERE ds.org_id = $1 AND ds.status = 'active' AND ds.deleted_at IS NULL`,
    [req.user.orgId],
  );

  res.json({ data: rows });
}

export async function getHandoverToken(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const driverId = req.user.driverId;
  if (!driverId) {
    throw HttpError.forbidden('Only drivers can generate handover tokens');
  }

  // 1. Get current active shift
  const activeShift = await query<{ id: string }>(
    `SELECT id FROM driver_shifts 
      WHERE driver_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [driverId],
  );

  if (activeShift.rows.length === 0) {
    throw HttpError.notFound('No active shift to handover');
  }

  // 2. Find active route
  const activeRoute = await query<{ route_id: string }>(
    `SELECT route_id FROM routes WHERE driver_id = $1 AND status = 'in_progress' LIMIT 1`,
    [driverId],
  );

  const routeId = activeRoute.rows[0]?.route_id || null;

  // 3. Sign short lived JWT
  const qrToken = jwt.sign(
    {
      sub: 'driver_shift_handover',
      shiftId: activeShift.rows[0].id,
      routeId,
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ qrToken });
}

