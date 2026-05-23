import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  forecasted_accumulation: z.number().nonnegative().optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
});

const updateSchema = createSchema.partial().extend({
  actual_accumulation: z.number().nonnegative().optional(),
});

export async function list(_req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT storm_id, name, start_time, end_time, forecasted_accumulation, actual_accumulation,
            status, created_at, updated_at
       FROM storm_events
      WHERE deleted_at IS NULL
      ORDER BY COALESCE(start_time, created_at) DESC`,
  );
  res.json({ data: rows });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT storm_id, name, start_time, end_time, forecasted_accumulation, actual_accumulation,
            status, created_at, updated_at
       FROM storm_events
      WHERE storm_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO storm_events (name, start_time, end_time, forecasted_accumulation, status)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'planned'))
     RETURNING storm_id, name, start_time, end_time, forecasted_accumulation, actual_accumulation,
               status, created_at, updated_at`,
    [
      body.name,
      body.start_time ?? null,
      body.end_time ?? null,
      body.forecasted_accumulation ?? null,
      body.status ?? null,
    ],
  );
  res.status(201).json(rows[0]);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = updateSchema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  const push = (sql: string, val: unknown) => {
    params.push(val);
    fields.push(sql.replace('?', `$${params.length}`));
  };

  if (body.name !== undefined) push('name = ?', body.name);
  if (body.start_time !== undefined) push('start_time = ?', body.start_time);
  if (body.end_time !== undefined) push('end_time = ?', body.end_time);
  if (body.forecasted_accumulation !== undefined) push('forecasted_accumulation = ?', body.forecasted_accumulation);
  if (body.actual_accumulation !== undefined) push('actual_accumulation = ?', body.actual_accumulation);
  if (body.status !== undefined) push('status = ?', body.status);

  if (fields.length === 0) throw HttpError.badRequest('No updatable fields supplied');

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE storm_events SET ${fields.join(', ')}, updated_at = NOW()
      WHERE storm_id = $${params.length} AND deleted_at IS NULL
      RETURNING storm_id, name, start_time, end_time, forecasted_accumulation, actual_accumulation,
                status, created_at, updated_at`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { rowCount } = await query(
    `UPDATE storm_events SET deleted_at = NOW() WHERE storm_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (rowCount === 0) throw HttpError.notFound();
  res.status(204).end();
}
