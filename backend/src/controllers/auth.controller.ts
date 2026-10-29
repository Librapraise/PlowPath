import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { env } from '../config/env';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import type { AuthPayload, UserRole } from '../middleware/auth.middleware';
import { sendEmail } from '../services/email.service';
import { sendSms } from '../services/twilio.service';

function hashIdentifier(id: string): string {
  return crypto.createHash('sha256').update(id).digest('hex');
}

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
  org_id: string | null;
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
  const identifierHash = hashIdentifier(identifier);

  try {
    const column = isEmail(identifier) ? 'email' : 'phone';
    const { rows } = await query<UserRow>(
      `SELECT u.user_id, u.email, u.phone, u.password_hash, u.role, u.name, u.org_id
         FROM users u
        WHERE u.${column} = $1 AND u.deleted_at IS NULL
        LIMIT 1`,
      [identifier],
    );

    const user = rows[0];
    if (!user) {
      logger.warn('Authentication failure: ip=%s identifier_hash=%s reason=%s', req.ip, identifierHash, 'User not found');
      throw HttpError.unauthorized('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      logger.warn('Authentication failure: ip=%s identifier_hash=%s reason=%s', req.ip, identifierHash, 'Password incorrect');
      throw HttpError.unauthorized('Invalid credentials');
    }

    let driverId: string | undefined;
    if (user.role === 'driver') {
      const dr = await query<{ driver_id: string }>(
        'SELECT driver_id FROM drivers WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [user.user_id],
      );
      driverId = dr.rows[0]?.driver_id;
    }

    const { access, refresh } = signTokens({ sub: user.user_id, role: user.role, driverId, orgId: user.org_id ?? undefined });
    logger.info('Authentication success: ip=%s identifier_hash=%s role=%s userId=%s', req.ip, identifierHash, user.role, user.user_id);

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
        org_id: user.org_id ?? null,
      },
    });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      logger.error('Authentication error: ip=%s identifier_hash=%s error=%s', req.ip, identifierHash, (error as Error).message);
    }
    throw error;
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refresh_token } = refreshSchema.parse(req.body);
  const tokenHash = hashIdentifier(refresh_token);
  let payload: AuthPayload & { typ?: string };
  try {
    payload = jwt.verify(refresh_token, env.JWT_SECRET) as AuthPayload & { typ?: string };
  } catch (error) {
    logger.warn('Token refresh failure: ip=%s token_hash=%s reason=%s', req.ip, tokenHash, 'Invalid refresh token');
    throw HttpError.unauthorized('Invalid refresh token');
  }
  if (payload.typ !== 'refresh') {
    logger.warn('Token refresh failure: ip=%s token_hash=%s reason=%s', req.ip, tokenHash, 'Wrong token type');
    throw HttpError.unauthorized('Wrong token type');
  }

  const { access, refresh: nextRefresh } = signTokens({
    sub: payload.sub,
    role: payload.role,
    driverId: payload.driverId,
    orgId: payload.orgId,
  });
  logger.info('Token refresh success: ip=%s token_hash=%s userId=%s', req.ip, tokenHash, payload.sub);
  res.json({ token: access, refresh_token: nextRefresh });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT — client discards tokens. A future revocation list would live in Redis.
  res.status(204).end();
}

const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'identifier (phone or email) is required'),
});

const resetPasswordSchema = z.object({
  identifier: z.string().min(3, 'identifier (phone or email) is required'),
  token: z.string().length(6, 'verification code must be exactly 6 digits'),
  newPassword: z.string().min(6, 'new password must be at least 6 characters'),
});

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { identifier } = forgotPasswordSchema.parse(req.body);
  const identifierHash = hashIdentifier(identifier);

  try {
    const column = isEmail(identifier) ? 'email' : 'phone';
    const { rows } = await query<UserRow>(
      `SELECT user_id, email, phone, name FROM users WHERE ${column} = $1 AND deleted_at IS NULL LIMIT 1`,
      [identifier],
    );

    const user = rows[0];
    if (!user) {
      // Avoid user enumeration
      logger.warn('Password reset request for non-existent user: identifier_hash=%s', identifierHash);
      res.status(200).json({ message: 'If the account exists, a reset code has been sent.' });
      return;
    }

    // Generate secure 6-digit random code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60000); // 15 minutes

    await query(
      `UPDATE users
          SET reset_token = $1,
              reset_token_expires_at = $2,
              updated_at = NOW()
        WHERE user_id = $3`,
      [rawCode, expiry, user.user_id],
    );

    logger.info('Generated reset code for user_id=%s, identifier_hash=%s', user.user_id, identifierHash);

    // Send code via Phone SMS or Email SMTP
    if (column === 'phone' && user.phone) {
      try {
        await sendSms({
          to: user.phone,
          body: `Your PlowPath password reset code is: ${rawCode}. It is valid for 15 minutes.`,
        });
      } catch (err) {
        logger.error('Failed to send password reset SMS to %s: %s', user.phone, (err as Error).message);
      }
    } else if (column === 'email' && user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'PlowPath Password Reset Code',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
              <h2 style="color: #3b82f6; font-size: 20px; font-weight: 800; margin-top: 0;">PlowPath Security Alert</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.5;">You requested to reset your password. Use the verification code below to establish a new password:</p>
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.1em; color: #1e293b; text-align: center; margin: 24px 0; padding: 12px; background: #e2e8f0; border-radius: 8px;">
                ${rawCode}
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This code is valid for exactly 15 minutes. If you did not request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (err) {
        logger.error('Failed to send password reset Email to %s: %s', user.email, (err as Error).message);
      }
    }

    res.status(200).json({ message: 'If the account exists, a reset code has been sent.' });
  } catch (error) {
    logger.error('ForgotPassword error: identifier_hash=%s error=%s', identifierHash, (error as Error).message);
    throw error;
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { identifier, token, newPassword } = resetPasswordSchema.parse(req.body);
  const identifierHash = hashIdentifier(identifier);

  try {
    const column = isEmail(identifier) ? 'email' : 'phone';
    const { rows } = await query<UserRow & { reset_token: string | null; reset_token_expires_at: string | null }>(
      `SELECT u.user_id, u.email, u.phone, u.reset_token, u.reset_token_expires_at
         FROM users u
        WHERE u.${column} = $1 AND u.deleted_at IS NULL
        LIMIT 1`,
      [identifier],
    );

    const user = rows[0];
    if (!user) {
      logger.warn('Password reset attempt for non-existent user: identifier_hash=%s', identifierHash);
      throw HttpError.badRequest('Invalid verification code or identifier');
    }

    if (!user.reset_token || user.reset_token !== token) {
      logger.warn('Password reset attempt with invalid token: user_id=%s', user.user_id);
      throw HttpError.badRequest('Invalid verification code or identifier');
    }

    const expiresAt = user.reset_token_expires_at ? new Date(user.reset_token_expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      logger.warn('Password reset attempt with expired token: user_id=%s', user.user_id);
      throw HttpError.badRequest('Verification code has expired');
    }

    const nextHash = await bcrypt.hash(newPassword, 10);

    // Clear reset token and save new password hash
    await query(
      `UPDATE users
          SET password_hash = $1,
              reset_token = NULL,
              reset_token_expires_at = NULL,
              updated_at = NOW()
        WHERE user_id = $2`,
      [nextHash, user.user_id],
    );

    logger.info('Password successfully reset for user_id=%s', user.user_id);
    res.status(200).json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      logger.error('ResetPassword error: identifier_hash=%s error=%s', identifierHash, (error as Error).message);
    }
    throw error;
  }
}
