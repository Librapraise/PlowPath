import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { optimizeRoute, totalRouteDistance, type OptStop } from '../services/optimization.service';
import { getDirections } from '../services/routing.service';
import { logger } from '../utils/logger';

const routeQuerySchema = z.object({
  action: z.enum(['install', 'remove']).default('install'),
  // Optional start coordinates for TSP
  start_lat: z.coerce.number().min(-90).max(90).optional(),
  start_lon: z.coerce.number().min(-180).max(180).optional(),
});

const updateSignSchema = z.object({
  sign_status: z.enum(['installed', 'removed', 'needs_service']),
});

type CustomerSignRow = {
  customer_id: string;
  name: string;
  address: string;
  sign_status: 'installed' | 'removed' | 'needs_service';
  lat: number;
  lon: number;
};

export async function getSignRoute(req: Request, res: Response): Promise<void> {
  const { action, start_lat, start_lon } = routeQuerySchema.parse(req.query);

  // 1. Fetch total progress statistics across all active customers
  const { rows: stats } = await query<{ total: string; installed: string; removed: string }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE sign_status = 'installed')::text AS installed,
            COUNT(*) FILTER (WHERE sign_status = 'removed')::text AS removed
       FROM customers
      WHERE deleted_at IS NULL AND status = 'active'`,
  );

  const totalActive = Number(stats[0]?.total ?? 0);
  const installedCount = Number(stats[0]?.installed ?? 0);
  const removedCount = Number(stats[0]?.removed ?? 0);

  // Progress is % of properties in the target state
  const progressPercent = totalActive > 0
    ? Math.round((action === 'install' ? installedCount : removedCount) / totalActive * 100)
    : 0;

  // 2. Fetch properties that need sign servicing
  const conditions = ['deleted_at IS NULL', "status = 'active'"];
  if (action === 'install') {
    conditions.push("sign_status IN ('removed', 'needs_service')");
  } else {
    conditions.push("sign_status IN ('installed', 'needs_service')");
  }

  const { rows: properties } = await query<CustomerSignRow>(
    `SELECT customer_id, name, address, sign_status,
            ST_Y(location::geography) AS lat,
            ST_X(location::geography) AS lon
       FROM customers
      WHERE ${conditions.join(' AND ')} AND location IS NOT NULL`,
  );

  if (properties.length === 0) {
    res.json({
      action,
      progress: progressPercent,
      total_miles: 0,
      stops: [],
      route_geometry: null,
    });
    return;
  }

  // 3. Optimize route using nearest-neighbor TSP
  const stops: OptStop[] = properties.map((p) => ({
    id: p.customer_id,
    lat: p.lat,
    lon: p.lon,
  }));

  const start: OptStop | undefined =
    start_lat != null && start_lon != null
      ? { id: '__start__', lat: start_lat, lon: start_lon }
      : undefined;

  const orderedStops = optimizeRoute(stops, start);
  const totalMiles = totalRouteDistance(start ? [start, ...orderedStops] : orderedStops);

  // 4. Fetch OSRM directions if there are multiple stops
  let routeGeometry: unknown = null;
  if (orderedStops.length >= 1) {
    const waypoints = start ? [start, ...orderedStops] : orderedStops;
    if (waypoints.length >= 2) {
      try {
        const directions = await getDirections(waypoints.map((w) => ({ lat: w.lat, lon: w.lon })));
        routeGeometry = directions.geometry;
      } catch (err) {
        logger.warn(`Could not compute OSRM routing for sign crew: ${(err as Error).message}`);
      }
    }
  }

  // Map the ordered stops back to include customer metadata
  const orderedStopsWithMetadata = orderedStops.map((stop, index) => {
    const prop = properties.find((p) => p.customer_id === stop.id);
    return {
      sequence_number: index + 1,
      customer_id: stop.id,
      name: prop?.name ?? 'Unknown Property',
      address: prop?.address ?? '',
      sign_status: prop?.sign_status ?? 'removed',
      lat: stop.lat,
      lon: stop.lon,
    };
  });

  res.json({
    action,
    progress: progressPercent,
    total_miles: Number(totalMiles.toFixed(2)),
    stops: orderedStopsWithMetadata,
    route_geometry: routeGeometry,
  });
}

export async function updateSignStatus(req: Request, res: Response): Promise<void> {
  const { customerId } = req.params;
  const { sign_status } = updateSignSchema.parse(req.body);

  const { rows } = await query(
    `UPDATE customers
        SET sign_status = $1::customer_sign_status,
            updated_at = NOW()
      WHERE customer_id = $2 AND deleted_at IS NULL
      RETURNING customer_id, name, address, sign_status, outstanding_balance, payment_status`,
    [sign_status, customerId],
  );

  if (!rows[0]) {
    throw HttpError.notFound('Customer not found');
  }

  res.json(rows[0]);
}
