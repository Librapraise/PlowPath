import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
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

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const parsed = profileSchema.parse(req.body);

  const { rows } = await query(
    `UPDATE users
        SET name = $1,
            email = $2,
            phone = $3,
            updated_at = NOW()
      WHERE user_id = $4 AND deleted_at IS NULL
     RETURNING user_id, email, phone, name, role`,
    [parsed.name, parsed.email ?? null, parsed.phone ?? null, req.user.sub]
  );

  if (rows.length === 0) {
    throw HttpError.notFound('User profile not found for update');
  }

  res.json(rows[0]);
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function updatePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const parsed = passwordSchema.parse(req.body);

  const { rows } = await query<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.user.sub]
  );

  const user = rows[0];
  if (!user) {
    throw HttpError.notFound('User account not found');
  }

  const matches = await bcrypt.compare(parsed.currentPassword, user.password_hash);
  if (!matches) {
    throw HttpError.badRequest('Incorrect current password');
  }

  const nextHash = await bcrypt.hash(parsed.newPassword, 10);
  await query(
    `UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
      WHERE user_id = $2 AND deleted_at IS NULL`,
    [nextHash, req.user.sub]
  );

  res.status(204).end();
}
