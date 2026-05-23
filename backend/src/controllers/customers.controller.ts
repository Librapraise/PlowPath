import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { geocodeAddress } from '../services/geocoding.service';

const upsertSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(3),
  phone: z.string().max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  property_type: z.enum(['residential', 'commercial']).optional(),
  driveway_type: z.string().max(64).optional().nullable(),
  access_notes: z.string().optional().nullable(),
  // If lat/lon omitted, we'll geocode the address.
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
});

// PostGIS returns location as either GeoJSON (if we ST_AsGeoJSON it) or a hex blob; we project explicitly.
const SELECT_COLS = `
  customer_id, name, address,
  ST_Y(location::geometry) AS lat,
  ST_X(location::geometry) AS lon,
  phone, email, status, property_type, payment_status,
  driveway_type, access_notes, sign_status,
  created_at, updated_at
`;

export async function list(req: Request, res: Response): Promise<void> {
  const { status, search, page, per_page } = listQuerySchema.parse(req.query);
  const offset = (page - 1) * per_page;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    conditions.push(`(name ILIKE $${i} OR address ILIKE $${i} OR phone ILIKE $${i})`);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  params.push(per_page, offset);
  const dataPromise = query(
    `SELECT ${SELECT_COLS} FROM customers ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countPromise = query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM customers ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  const [data, count] = await Promise.all([dataPromise, countPromise]);
  res.json({
    data: data.rows,
    page,
    per_page,
    total: Number(count.rows[0]?.total ?? 0),
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT ${SELECT_COLS} FROM customers WHERE customer_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = upsertSchema.parse(req.body);
  let lat = body.lat;
  let lon = body.lon;
  if (lat == null || lon == null) {
    const g = await geocodeAddress(body.address);
    lat = g.lat;
    lon = g.lon;
  }
  const { rows } = await query(
    `INSERT INTO customers
       (name, address, location, phone, email, status, property_type, driveway_type, access_notes)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
             $5, $6, COALESCE($7, 'active'), COALESCE($8, 'residential'), $9, $10)
     RETURNING ${SELECT_COLS}`,
    [
      body.name,
      body.address,
      lat,
      lon,
      body.phone ?? null,
      body.email ?? null,
      body.status ?? null,
      body.property_type ?? null,
      body.driveway_type ?? null,
      body.access_notes ?? null,
    ],
  );
  res.status(201).json(rows[0]);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = upsertSchema.partial().parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];

  const push = (sqlFragment: string, value: unknown) => {
    params.push(value);
    fields.push(sqlFragment.replace('?', `$${params.length}`));
  };

  if (body.name !== undefined) push('name = ?', body.name);
  if (body.address !== undefined) push('address = ?', body.address);
  if (body.phone !== undefined) push('phone = ?', body.phone);
  if (body.email !== undefined) push('email = ?', body.email);
  if (body.status !== undefined) push('status = ?', body.status);
  if (body.property_type !== undefined) push('property_type = ?', body.property_type);
  if (body.driveway_type !== undefined) push('driveway_type = ?', body.driveway_type);
  if (body.access_notes !== undefined) push('access_notes = ?', body.access_notes);
  if (body.lat !== undefined && body.lon !== undefined) {
    params.push(body.lon, body.lat);
    fields.push(
      `location = ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`,
    );
  }

  if (fields.length === 0) throw HttpError.badRequest('No updatable fields supplied');

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE customers SET ${fields.join(', ')}, updated_at = NOW()
      WHERE customer_id = $${params.length} AND deleted_at IS NULL
      RETURNING ${SELECT_COLS}`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { rowCount } = await query(
    `UPDATE customers SET deleted_at = NOW() WHERE customer_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (rowCount === 0) throw HttpError.notFound();
  res.status(204).end();
}

export async function geocodePreview(req: Request, res: Response): Promise<void> {
  const address = req.query.address as string;
  if (!address) throw HttpError.badRequest('Address parameter is required');
  const result = await geocodeAddress(address);
  res.json(result);
}

