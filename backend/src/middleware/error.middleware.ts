import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError || (err && (err.name === 'HttpError' || (typeof err.status === 'number' && typeof err.code === 'string')))) {
    const status = err.status || 500;
    const code = err.code || 'error';
    logger.warn('HttpError handled: %d %s - %s', status, code, err.message);
    res.status(status).json({
      error: { code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    const issueMessages = err.issues.map((issue) => {
      const field = issue.path.join('.');
      // Make it user-friendly by capitalizing the field name
      const fieldName = field ? field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ') : 'Field';
      return `${fieldName}: ${issue.message}`;
    });
    const message = issueMessages.join(', ');
    logger.warn('ZodError validation failed: %s', message);
    res.status(400).json({
      error: {
        code: 'validation_error',
        message,
        details: err.flatten(),
      },
    });
    return;
  }


  logger.error('Unhandled error', err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Internal server error' },
  });
};

