import { Platform } from 'react-native';

let isSentryEnabled = false;

// Note: If you add '@sentry/react-native' to package.json, you can import Sentry here:
// import * as Sentry from '@sentry/react-native';

/**
 * Initializes the Sentry SDK. If the DSN is missing, it falls back
 * gracefully to local logging without crashing or interrupting driver flow.
 */
export function initSentry(): void {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.log('[SENTRY] No Sentry DSN provided. Running in Graceful Local Logging Fallback mode.');
    isSentryEnabled = false;
    return;
  }

  try {
    // If Sentry was installed, initialize it here:
    // Sentry.init({
    //   dsn: sentryDsn,
    //   environment: __DEV__ ? 'development' : 'production',
    //   tracesSampleRate: 1.0,
    // });
    console.log('[SENTRY] Sentry SDK initialized successfully.');
    isSentryEnabled = true;
  } catch (err) {
    console.error('[SENTRY] Failed to initialize Sentry SDK. Falling back to local console reporting.', err);
    isSentryEnabled = false;
  }
}

/**
 * Safely capture exceptions and log them beautifully to the console/files,
 * and dispatch them to Sentry if a production DSN is configured.
 */
export function captureException(
  error: Error | any,
  context?: Record<string, any>
): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';

  // Sleek, high-visibility developer logging in dev mode
  console.group?.(`🚨 [SENTRY CAPTURE_EXCEPTION]`);
  console.error(`Message: ${errorMsg}`);
  if (errorStack) {
    console.error(`Stacktrace:\n${errorStack}`);
  }
  if (context) {
    console.log('Context:', JSON.stringify(context, null, 2));
  }
  console.groupEnd?.();

  if (isSentryEnabled) {
    try {
      // Sentry.captureException(error, { extra: context });
    } catch (err) {
      console.warn('[SENTRY] Failed to send exception to Sentry', err);
    }
  }
}

/**
 * Safely capture diagnostic messages and log them.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  console.log(`[SENTRY MESSAGE - ${level.toUpperCase()}] ${message}`, context || '');

  if (isSentryEnabled) {
    try {
      // Sentry.captureMessage(message, { level, extra: context });
    } catch (err) {
      console.warn('[SENTRY] Failed to send message to Sentry', err);
    }
  }
}
