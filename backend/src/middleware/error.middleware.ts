import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    logger.warn('HttpError handled: %d %s - %s', err.status, err.code, err.message);
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
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

