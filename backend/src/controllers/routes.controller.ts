import type { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { optimizeRoute, totalRouteDistance, type OptStop } from '../services/optimization.service';
import { getDirections } from '../services/routing.service';
import { enqueuePushNotification, enqueueSmsNotification } from '../services/notification.service';

const generateSchema = z.object({
  storm_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  route_name: z.string().min(1).max(255),
  customer_ids: z.array(z.string().uuid()).min(1).max(500),
  // Optional starting point — usually the depot/yard. Falls back to first customer.
  start_lat: z.number().min(-90).max(90).optional(),
  start_lon: z.number().min(-180).max(180).optional(),
  // If false, skips OSRM (faster, useful for very large routes or local dev offline).
  include_directions: z.boolean().default(true),
});

const updateStopSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  notes: z.string().max(2000).optional(),
});

type CustomerRow = {
  customer_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
};

export async function generate(req: Request, res: Response): Promise<void> {
  const body = generateSchema.parse(req.body);

  const { rows: customers } = await query<CustomerRow>(
    `SELECT customer_id, name, address,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lon
       FROM customers
      WHERE customer_id = ANY($1::uuid[]) AND deleted_at IS NULL AND location IS NOT NULL`,
    [body.customer_ids],
  );

  if (customers.length === 0) {
    throw HttpError.badRequest('None of the supplied customers exist or have coordinates');
  }
  if (customers.length !== body.customer_ids.length) {
    // Soft warning via header — we still optimize what we can.
    res.setHeader('X-PlowPath-Skipped-Customers', String(body.customer_ids.length - customers.length));
  }

  const stops: OptStop[] = customers.map((c) => ({ id: c.customer_id, lat: c.lat, lon: c.lon }));
  const start: OptStop | undefined =
    body.start_lat != null && body.start_lon != null
      ? { id: '__start__', lat: body.start_lat, lon: body.start_lon }
      : undefined;

  const ordered = optimizeRoute(stops, start);
  const totalMiles = totalRouteDistance(start ? [start, ...ordered] : ordered);

  let osrmGeometry: unknown = null;
  let osrmSteps: unknown = null;
  if (body.include_directions && ordered.length >= 1) {
    const waypoints = start ? [start, ...ordered] : ordered;
    if (waypoints.length >= 2) {
      const directions = await getDirections(waypoints.map((s) => ({ lat: s.lat, lon: s.lon })));
      osrmGeometry = directions.geometry;
      osrmSteps = directions.steps;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const routeRes = await client.query<{ route_id: string }>(
      `INSERT INTO routes (storm_id, driver_id, route_name, status, total_distance, osrm_geometry, osrm_steps)
       VALUES ($1, $2, $3, 'assigned', $4, $5, $6)
       RETURNING route_id`,
      [
        body.storm_id,
        body.driver_id,
        body.route_name,
        totalMiles,
        osrmGeometry ? JSON.stringify(osrmGeometry) : null,
        osrmSteps ? JSON.stringify(osrmSteps) : null,
      ],
    );
    const routeId = routeRes.rows[0].route_id;

    // Batch-insert stops in the optimized sequence.
    const values: string[] = [];
    const params: unknown[] = [];
    ordered.forEach((stop, idx) => {
      params.push(routeId, stop.id, idx + 1);
      const i = params.length;
      values.push(`($${i - 2}, $${i - 1}, $${i})`);
    });
    await client.query(
      `INSERT INTO route_stops (route_id, customer_id, sequence_number) VALUES ${values.join(', ')}`,
      params,
    );

    await client.query('COMMIT');

    // Enqueue push notification to notify the driver of the new route assignment.
    enqueuePushNotification(
      body.driver_id,
      'New Route Assigned',
      `Route "${body.route_name}" has been assigned to you.`,
    ).catch((err) => {
      // Log the background notification failure gracefully.
      // eslint-disable-next-line no-console
      console.error(`Failed to enqueue route assignment notification for driver ${body.driver_id}:`, err);
    });

    res.status(201).json({
      route_id: routeId,
      driver_id: body.driver_id,
      storm_id: body.storm_id,
      route_name: body.route_name,
      total_miles: Number(totalMiles.toFixed(2)),
      stop_count: ordered.length,
      directions_included: osrmGeometry != null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const stormId = req.query.storm_id as string | undefined;
  const driverId = req.query.driver_id as string | undefined;
  const params: unknown[] = [];
  const where: string[] = ['r.deleted_at IS NULL'];
  if (stormId) {
    params.push(stormId);
    where.push(`r.storm_id = $${params.length}`);
  }
  if (driverId) {
    params.push(driverId);
    where.push(`r.driver_id = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT r.route_id, r.storm_id, r.driver_id, r.route_name, r.status,
            r.start_time, r.end_time, r.total_distance,
            (SELECT COUNT(*) FROM route_stops s WHERE s.route_id = r.route_id) AS stop_count
       FROM routes r
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC`,
    params,
  );
  res.json({ data: rows });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const routeId = req.params.id;
  const { rows: routeRows } = await query(
    `SELECT route_id, storm_id, driver_id, route_name, status, start_time, end_time,
            total_distance, osrm_geometry, osrm_steps, created_at, updated_at
       FROM routes WHERE route_id = $1 AND deleted_at IS NULL`,
    [routeId],
  );
  const route = routeRows[0];
  if (!route) throw HttpError.notFound();

  const { rows: stops } = await query(
    `SELECT s.stop_id, s.sequence_number, s.status, s.arrival_time, s.completion_time, s.notes,
            c.customer_id, c.name, c.address, c.access_notes, c.phone,
            ST_Y(c.location::geometry) AS lat,
            ST_X(c.location::geometry) AS lon
       FROM route_stops s
       JOIN customers c ON c.customer_id = s.customer_id
      WHERE s.route_id = $1
      ORDER BY s.sequence_number`,
    [routeId],
  );

  res.json({ ...route, stops });
}

interface UpdateStopRow extends Record<string, any> {
  stop_id: string;
  route_id: string;
  customer_id: string;
  sequence_number: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  arrival_time: string | null;
  completion_time: string | null;
  notes: string | null;
}

export async function updateStop(req: Request, res: Response): Promise<void> {
  const body = updateStopSchema.parse(req.body);
  const params: unknown[] = [];
  const fields: string[] = [];
  const push = (sql: string, v: unknown) => {
    params.push(v);
    fields.push(sql.replace('?', `$${params.length}`));
  };

  push('status = ?', body.status);
  if (body.notes !== undefined) push('notes = ?', body.notes);
  if (body.status === 'in_progress') fields.push('arrival_time = COALESCE(arrival_time, NOW())');
  if (body.status === 'completed') fields.push('completion_time = NOW()');

  params.push(req.params.stopId);
  const { rows } = await query<UpdateStopRow>(
    `UPDATE route_stops SET ${fields.join(', ')}, updated_at = NOW()
      WHERE stop_id = $${params.length}
      RETURNING stop_id, route_id, customer_id, sequence_number, status,
                arrival_time, completion_time, notes`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  
  const currentStop = rows[0];
  if (body.status === 'completed') {
    // 1. Notify current customer that the plow has finished
    enqueueSmsNotification(
      currentStop.customer_id,
      'completed',
      'Your property has been cleared successfully by PlowPath. Thank you!'
    ).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to enqueue stop completion SMS:', err);
    });

    // 2. Notify next customer in the sequence that the plow is en-route
    query<{ customer_id: string }>(
      'SELECT customer_id FROM route_stops WHERE route_id = $1 AND sequence_number = $2',
      [currentStop.route_id, currentStop.sequence_number + 1],
    ).then(({ rows: nextRows }) => {
      const nextStop = nextRows[0];
      if (nextStop) {
        void enqueueSmsNotification(
          nextStop.customer_id,
          'en_route',
          'PlowPath is en-route to your property now. Please ensure your driveway is clear of all vehicles.'
        );
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to notify next customer in sequence:', err);
    });
  }

  res.json(currentStop);
}

const updateRouteSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'completed']),
});

export async function updateRoute(req: Request, res: Response): Promise<void> {
  const body = updateRouteSchema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  const push = (sql: string, v: unknown) => {
    params.push(v);
    fields.push(sql.replace('?', `$${params.length}`));
  };

  push('status = ?', body.status);
  if (body.status === 'in_progress') {
    fields.push('start_time = COALESCE(start_time, NOW())');
  } else if (body.status === 'completed') {
    fields.push('end_time = COALESCE(end_time, NOW())');
  }

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE routes SET ${fields.join(', ')}, updated_at = NOW()
      WHERE route_id = $${params.length} AND deleted_at IS NULL
      RETURNING route_id, status, start_time, end_time`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  
  const updatedRoute = rows[0];
  if (body.status === 'in_progress') {
    // Notify the first customer that their plow has started their route
    query<{ customer_id: string }>(
      'SELECT customer_id FROM route_stops WHERE route_id = $1 AND sequence_number = 1',
      [updatedRoute.route_id],
    ).then(({ rows: firstRows }) => {
      const firstStop = firstRows[0];
      if (firstStop) {
        void enqueueSmsNotification(
          firstStop.customer_id,
          'en_route',
          'PlowPath is en-route to your property now. Please ensure your driveway is clear of all vehicles.'
        );
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to notify first customer on route start:', err);
    });
  }

  res.json(updatedRoute);
}

const broadcastSchema = z.object({
  message: z.string().min(1).max(1000),
});

export async function broadcastSms(req: Request, res: Response): Promise<void> {
  const routeId = req.params.id;
  const body = broadcastSchema.parse(req.body);

  const { rows: stops } = await query<{ customer_id: string }>(
    'SELECT customer_id FROM route_stops WHERE route_id = $1',
    [routeId],
  );

  if (stops.length > 0) {
    for (const stop of stops) {
      await enqueueSmsNotification(
        stop.customer_id,
        'broadcast',
        body.message,
        true, // bypassLimit = true for manual dispatcher broadcasts
      );
    }
  }

  res.status(200).json({ success: true, enqueued_count: stops.length });
}
