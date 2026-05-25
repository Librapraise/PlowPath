import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { broadcastGpsUpdate } from '../sockets';

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy_m: z.number().nonnegative().optional(),
  speed_mps: z.number().nonnegative().optional(),
  heading_deg: z.number().min(0).max(360).optional(),
  recorded_at: z.string().datetime(),
  route_id: z.string().uuid().optional(),
});

const batchSchema = z.object({
  driver_id: z.string().uuid().optional(),
  points: z.array(pointSchema).min(1).max(500),
});

/** Submit one or many GPS samples — mobile uses this to flush the offline queue. */
export async function ingest(req: Request, res: Response): Promise<void> {
  const body = batchSchema.parse(req.body);

  const driverId = body.driver_id ?? req.user?.driverId;
  if (!driverId) {
    throw HttpError.badRequest('driver_id is required when caller is not a driver');
  }
  if (req.user?.role === 'driver' && req.user.driverId !== driverId) {
    throw HttpError.forbidden('Drivers can only post their own GPS data');
  }

  const values: string[] = [];
  const params: unknown[] = [];
  for (const p of body.points) {
    params.push(
      driverId,
      p.route_id ?? null,
      p.lon, p.lat,
      p.accuracy_m ?? null,
      p.speed_mps ?? null,
      p.heading_deg ?? null,
      p.recorded_at,
    );
    const i = params.length;
    values.push(
      `($${i - 7}, $${i - 6}, ST_SetSRID(ST_MakePoint($${i - 5}, $${i - 4}), 4326)::geography, $${i - 3}, $${i - 2}, $${i - 1}, $${i})`,
    );
  }

  await query(
    `INSERT INTO gps_tracking (driver_id, route_id, location, accuracy_m, speed_mps, heading_deg, recorded_at)
     VALUES ${values.join(', ')}`,
    params,
  );

  // Broadcast just the latest sample so dashboards don't get flooded by offline backfills.
  const latest = body.points[body.points.length - 1];
  broadcastGpsUpdate({
    driver_id: driverId,
    route_id: latest.route_id ?? null,
    lat: latest.lat,
    lon: latest.lon,
    recorded_at: latest.recorded_at,
  });

  res.status(202).json({ ingested: body.points.length });
}

/** Latest position per driver — for dashboard initial load before WS opens. */
export async function latestForAll(_req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT DISTINCT ON (driver_id)
            driver_id,
            ST_Y(location::geography) AS lat,
            ST_X(location::geography) AS lon,
            speed_mps, heading_deg, accuracy_m, recorded_at
       FROM gps_tracking
      ORDER BY driver_id, recorded_at DESC`,
  );
  res.json({ data: rows });
}

/** Breadcrumb trail for a single driver, optionally filtered by time. */
export async function driverHistory(req: Request, res: Response): Promise<void> {
  const driverId = req.params.id;
  const since = (req.query.since as string | undefined) ?? null;
  const limit = Math.min(Number(req.query.limit ?? 1000), 5000);

  const params: unknown[] = [driverId];
  let whereSince = '';
  if (since) {
    params.push(since);
    whereSince = `AND recorded_at >= $${params.length}`;
  }
  params.push(limit);

  const { rows } = await query(
    `SELECT ST_Y(location::geography) AS lat,
            ST_X(location::geography) AS lon,
            speed_mps, heading_deg, accuracy_m, recorded_at, route_id
       FROM gps_tracking
      WHERE driver_id = $1 ${whereSince}
      ORDER BY recorded_at DESC
      LIMIT $${params.length}`,
    params,
  );
  res.json({ data: rows });
}
