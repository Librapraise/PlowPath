import type { Request, Response } from 'express';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';

/** Authenticated user's own profile — used by mobile and web on app start. */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const { rows } = await query(
    `SELECT u.user_id, u.email, u.phone, u.name, u.role,
            d.driver_id
       FROM users u
  LEFT JOIN drivers d ON d.user_id = u.user_id AND d.deleted_at IS NULL
      WHERE u.user_id = $1 AND u.deleted_at IS NULL`,
    [req.user.sub],
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}
