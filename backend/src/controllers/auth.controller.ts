import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import type { AuthPayload, UserRole } from '../middleware/auth.middleware';

const loginSchema = z.object({
  identifier: z.string().min(3, 'identifier (phone or email) is required'),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

type UserRow = {
  user_id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  role: UserRole;
  name: string;
};

function isEmail(s: string): boolean {
  return /@/.test(s);
}

function signTokens(payload: AuthPayload) {
  const accessOpts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };
  const access = jwt.sign(payload, env.JWT_SECRET, accessOpts);
  const refresh = jwt.sign({ ...payload, typ: 'refresh' }, env.JWT_SECRET, refreshOpts);
  return { access, refresh };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { identifier, password } = loginSchema.parse(req.body);

  const column = isEmail(identifier) ? 'email' : 'phone';
  const { rows } = await query<UserRow>(
    `SELECT u.user_id, u.email, u.phone, u.password_hash, u.role, u.name
       FROM users u
      WHERE u.${column} = $1 AND u.deleted_at IS NULL
      LIMIT 1`,
    [identifier],
  );

  const user = rows[0];
  if (!user) throw HttpError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw HttpError.unauthorized('Invalid credentials');

  let driverId: string | undefined;
  if (user.role === 'driver') {
    const dr = await query<{ driver_id: string }>(
      'SELECT driver_id FROM drivers WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
      [user.user_id],
    );
    driverId = dr.rows[0]?.driver_id;
  }

  const { access, refresh } = signTokens({ sub: user.user_id, role: user.role, driverId });
  res.json({
    token: access,
    refresh_token: refresh,
    user: {
      user_id: user.user_id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      driver_id: driverId ?? null,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refresh_token } = refreshSchema.parse(req.body);
  let payload: AuthPayload & { typ?: string };
  try {
    payload = jwt.verify(refresh_token, env.JWT_SECRET) as AuthPayload & { typ?: string };
  } catch {
    throw HttpError.unauthorized('Invalid refresh token');
  }
  if (payload.typ !== 'refresh') throw HttpError.unauthorized('Wrong token type');

  const { access, refresh: nextRefresh } = signTokens({
    sub: payload.sub,
    role: payload.role,
    driverId: payload.driverId,
  });
  res.json({ token: access, refresh_token: nextRefresh });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT — client discards tokens. A future revocation list would live in Redis.
  res.status(204).end();
}
