import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool, query } from '../config/db';
import { HttpError } from '../utils/httpError';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(7).max(32),
  email: z.string().email().optional(),
  password: z.string().min(8),
  hourly_rate: z.number().nonnegative().optional(),
  vehicle_type: z.string().max(64).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(7).max(32).optional(),
  hourly_rate: z.number().nonnegative().optional(),
  vehicle_type: z.string().max(64).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const SELECT_DRIVER = `
  d.driver_id, d.user_id, d.name, d.phone, d.hourly_rate, d.vehicle_type, d.status,
  d.created_at, d.updated_at,
  u.email AS user_email
`;

export async function list(_req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT ${SELECT_DRIVER}
       FROM drivers d
       JOIN users u ON u.user_id = d.user_id
      WHERE d.deleted_at IS NULL
      ORDER BY d.created_at DESC`,
  );
  res.json({ data: rows });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT ${SELECT_DRIVER}
       FROM drivers d
       JOIN users u ON u.user_id = d.user_id
      WHERE d.driver_id = $1 AND d.deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'driver', $4)
       RETURNING user_id`,
      [body.email ?? null, body.phone, passwordHash, body.name],
    );
    const userId = userRes.rows[0].user_id;

    const driverRes = await client.query(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING driver_id, user_id, name, phone, hourly_rate, vehicle_type, status, created_at, updated_at`,
      [userId, body.name, body.phone, body.hourly_rate ?? null, body.vehicle_type ?? null],
    );

    await client.query('COMMIT');
    res.status(201).json(driverRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = updateSchema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  const push = (sqlFragment: string, value: unknown) => {
    params.push(value);
    fields.push(sqlFragment.replace('?', `$${params.length}`));
  };

  if (body.name !== undefined) push('name = ?', body.name);
  if (body.phone !== undefined) push('phone = ?', body.phone);
  if (body.hourly_rate !== undefined) push('hourly_rate = ?', body.hourly_rate);
  if (body.vehicle_type !== undefined) push('vehicle_type = ?', body.vehicle_type);
  if (body.status !== undefined) push('status = ?', body.status);

  if (fields.length === 0) throw HttpError.badRequest('No updatable fields supplied');

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE drivers SET ${fields.join(', ')}, updated_at = NOW()
      WHERE driver_id = $${params.length} AND deleted_at IS NULL
      RETURNING driver_id, user_id, name, phone, hourly_rate, vehicle_type, status, created_at, updated_at`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { rowCount } = await query(
    `UPDATE drivers SET deleted_at = NOW() WHERE driver_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (rowCount === 0) throw HttpError.notFound();
  res.status(204).end();
}

const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1).max(255),
});

export async function updateFcmToken(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const body = fcmTokenSchema.parse(req.body);

  const { rows } = await query(
    `UPDATE drivers SET fcm_token = $1, updated_at = NOW()
      WHERE user_id = $2 AND deleted_at IS NULL
      RETURNING driver_id, user_id, name, phone, fcm_token, updated_at`,
    [body.fcm_token, req.user.sub],
  );

  if (!rows[0]) {
    throw HttpError.notFound('Driver profile not found for this authenticated user');
  }

  res.json(rows[0]);
}
