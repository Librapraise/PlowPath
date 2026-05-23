import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Invalid request body',
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
