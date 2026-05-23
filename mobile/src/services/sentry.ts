import * as Sentry from '@sentry/react-native';

let isSentryEnabled = false;

/**
 * Initialize the Sentry SDK. If SENTRY_DSN is missing (typical for dev/CI),
 * fall back to a console-only logging mode so drivers and tests aren't affected.
 */
export function initSentry(): void {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.log('[SENTRY] No SENTRY_DSN provided — running in console-only fallback mode.');
    isSentryEnabled = false;
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      // Don't capture spurious dev-mode reload errors.
      enabled: !__DEV__ || !!process.env.SENTRY_FORCE_DEV,
    });
    console.log('[SENTRY] SDK initialized successfully.');
    isSentryEnabled = true;
  } catch (err) {
    console.error('[SENTRY] init failed; falling back to console logging.', err);
    isSentryEnabled = false;
  }
}

/**
 * Capture an exception. Always logs to console in dev for visibility; also
 * dispatches to Sentry when DSN is configured.
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>,
): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';

  console.group?.('🚨 [SENTRY CAPTURE_EXCEPTION]');
  console.error(`Message: ${errorMsg}`);
  if (errorStack) console.error(`Stacktrace:\n${errorStack}`);
  if (context) console.log('Context:', JSON.stringify(context, null, 2));
  console.groupEnd?.();

  if (isSentryEnabled) {
    try {
      Sentry.captureException(error, { extra: context });
    } catch (err) {
      console.warn('[SENTRY] Failed to send exception', err);
    }
  }
}

/**
 * Capture a non-error diagnostic message at the given level.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>,
): void {
  console.log(`[SENTRY MESSAGE - ${level.toUpperCase()}] ${message}`, context || '');

  if (isSentryEnabled) {
    try {
      Sentry.captureMessage(message, { level, extra: context });
    } catch (err) {
      console.warn('[SENTRY] Failed to send message', err);
    }
  }
}
