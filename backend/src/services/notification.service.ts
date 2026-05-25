import Queue from 'bull';
import admin from 'firebase-admin';
import { env } from '../config/env';
import { query } from '../config/db';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { sendSms } from './twilio.service';

// 1. Initialize the Bull Queue powered by the standard Redis URL.
export const pushQueue = new Queue('push-notifications', env.REDIS_URL);

let firebaseInitialized = false;

// 2. Safely initialize the Firebase Admin SDK if credentials are provided in the environment.
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK', err);
  }
} else {
  logger.warn('Firebase environment variables are missing; push notifications will run in MOCK / DRY RUN mode.');
}

// 3. Register the async Bull queue processor.
pushQueue.process(async (job) => {
  const { driverId, title, body, data, isSeasonalReminder, action } = job.data;

  if (isSeasonalReminder) {
    logger.info(`[BULL CRON] Processing seasonal sign reminder for action: ${action}`);
    const { rows: drivers } = await query<{ driver_id: string }>(
      `SELECT driver_id FROM drivers WHERE deleted_at IS NULL`
    );
    for (const d of drivers) {
      await enqueuePushNotification(
        d.driver_id,
        action === 'install' ? 'Install Yard Signs' : 'Remove Yard Signs',
        action === 'install'
          ? 'Winter is coming! Please view the sign route to install yard signs.'
          : 'Winter is over! Please view the sign route to remove yard signs.',
        { screen: 'SignRoute', action }
      );
    }
    return;
  }

  logger.debug(`Processing push notification job ${job.id} for driver ${driverId}`);

  try {
    // Fetch the driver's registered FCM token from the database.
    const { rows } = await query<{ fcm_token: string | null; name: string }>(
      'SELECT fcm_token, name FROM drivers WHERE driver_id = $1 AND deleted_at IS NULL',
      [driverId],
    );

    const driver = rows[0];
    if (!driver) {
      logger.warn(`Driver ${driverId} not found or deleted; skipping push dispatch`);
      return;
    }

    const token = driver.fcm_token;
    if (!token) {
      logger.info(`Driver "${driver.name}" (${driverId}) has no registered fcm_token; simulating push alert.`);
      logger.info(`[MOCK PUSH ALERT] To: ${driver.name} | Title: "${title}" | Body: "${body}" | Data: ${JSON.stringify(data)}`);
      return;
    }

    if (!firebaseInitialized) {
      logger.info(`[DRY RUN PUSH] Live Firebase credentials not loaded. Target: ${token} | Title: "${title}" | Body: "${body}" | Data: ${JSON.stringify(data)}`);
      return;
    }

    // Deliver the push notification via Firebase Admin SDK.
    const messageId = await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data: data || {}, // Pass key-value payload for deep-linking and categories
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK', // standard intent filter mapping
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    logger.info(`Successfully dispatched live FCM push notification to ${driver.name}: ${messageId}`);
  } catch (err) {
    logger.error(`Failed to dispatch FCM push notification to driver ${driverId}`, err);
    throw err; // rethrow so Bull handles retry logic
  }
});

/**
 * Enqueues a push notification job into the Redis-backed Bull queue.
 */
export async function enqueuePushNotification(
  driverId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await pushQueue.add(
    { driverId, title, body, data },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    },
  );
}

// 4. Initialize the Bull Queue for SMS alerts
export const smsQueue = new Queue('sms-notifications', env.REDIS_URL);

// 5. Register the SMS Bull queue processor
smsQueue.process(async (job) => {
  const { customerId, type, body, bypassLimit } = job.data;
  logger.debug(`Processing SMS notification job ${job.id} of type "${type}" for customer ${customerId}`);

  try {
    // Fetch customer details from database
    const { rows } = await query<{
      phone: string | null;
      notify_sms: boolean;
      sms_opt_out_at: string | null;
      name: string;
    }>(
      'SELECT phone, notify_sms, sms_opt_out_at, name FROM customers WHERE customer_id = $1 AND deleted_at IS NULL',
      [customerId],
    );

    const customer = rows[0];
    if (!customer) {
      logger.warn(`Customer ${customerId} not found or deleted; skipping SMS dispatch`);
      return;
    }

    const phone = customer.phone;
    if (!phone) {
      logger.warn(`Customer "${customer.name}" (${customerId}) has no registered phone number; skipping SMS dispatch`);
      return;
    }

    // Check opt-out status
    if (!customer.notify_sms || customer.sms_opt_out_at) {
      logger.info(`Customer "${customer.name}" (${customerId}) has opted out of SMS alerts; skipping SMS dispatch`);
      return;
    }

    // Enforce sliding window rate limit: max 1 SMS per customer per hour
    const rateLimitKey = `plowpath:sms_limit:${customerId}`;
    if (!bypassLimit) {
      const isRateLimited = await redis.get(rateLimitKey);
      if (isRateLimited) {
        logger.warn(`Customer "${customer.name}" (${customerId}) is rate-limited (max 1 SMS per hour). Skipping outbound dispatch.`);
        return;
      }
    }

    // Dispatch the SMS
    await sendSms({ to: phone, body });

    // Set/renew the Redis rate limit key (1 hour expiration) if not bypassed
    if (!bypassLimit) {
      await redis.set(rateLimitKey, '1', 'EX', 3600);
    }

    logger.info(`Successfully completed SMS notification job ${job.id} for customer "${customer.name}"`);
  } catch (err) {
    logger.error(`Failed to process SMS notification job for customer ${customerId}`, err);
    throw err;
  }
});

/**
 * Enqueues an SMS notification job into the Redis-backed Bull queue.
 */
export async function enqueueSmsNotification(
  customerId: string,
  type: 'pre_storm' | 'en_route' | 'completed' | 'broadcast',
  body: string,
  bypassLimit = false,
): Promise<void> {
  await smsQueue.add(
    { customerId, type, body, bypassLimit },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    },
  );
}

// Register repeatable jobs for seasonal sign transitions (FR-4.3.6)
export async function scheduleSeasonalReminders(): Promise<void> {
  try {
    const repeatableJobs = await pushQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await pushQueue.removeRepeatableByKey(job.key);
    }

    // Schedule Oct 15
    await pushQueue.add(
      { isSeasonalReminder: true, action: 'install' },
      { repeat: { cron: '0 9 15 10 *' } }
    );

    // Schedule Apr 15
    await pushQueue.add(
      { isSeasonalReminder: true, action: 'remove' },
      { repeat: { cron: '0 9 15 4 *' } }
    );

    logger.info('Scheduled repeatable seasonal sign-transition Bull cron jobs');
  } catch (err) {
    logger.error('Failed to schedule seasonal reminders', err);
  }
}
