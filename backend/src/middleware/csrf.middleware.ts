import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
  });
  return list;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const isMobile = req.headers['x-client-type'] === 'mobile-app';
  if (isMobile) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  let csrfToken = cookies['csrf-token'];

  // 1. Generate CSRF token if missing
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // 2. Validate token on write operations for Web Dashboard clients
  const method = req.method.toUpperCase();
  const isWriteMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (isWriteMethod) {
    const isWebDashboard = req.headers['x-client-type'] === 'web-dashboard' || !!cookies['csrf-token'];

    if (isWebDashboard) {
      const headerToken = req.headers['x-csrf-token'];
      if (!headerToken || headerToken !== csrfToken) {
        res.status(403).json({
          error: {
            code: 'invalid_csrf_token',
            message: 'Invalid or missing CSRF token. Request aborted.',
          },
        });
        return;
      }
    }
  }

  next();
}
export { parseCookies };
