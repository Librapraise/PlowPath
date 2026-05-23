import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../config/env';

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} ${level} ${stack ?? message}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console()
];

if (env.NODE_ENV === 'development') {
  transports.push(new DailyRotateFile({
    filename: 'logs/plowpath-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      splat(),
      json()
    )
  }));
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production'
    ? combine(timestamp(), errors({ stack: true }), splat(), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), splat(), devFormat),
  transports,
});
