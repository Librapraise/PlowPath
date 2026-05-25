import Queue from 'bull';
import { query } from '../config/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { enqueuePushNotification } from './notification.service';
import { sendSms } from './twilio.service';
import { broadcastUrgentRequestUpdate, broadcastRouteUpdate } from '../sockets';

// Initialize the Redis-backed Bull queue for emergency call escalations.
export const urgentEscalationQueue = new Queue('urgent-escalations', env.REDIS_URL);

type UrgentRequest = {
  request_id: string;
  customer_id: string;
  storm_id: string;
  status: 'pending' | 'assigned' | 'declined_escalating' | 'expired';
  assigned_driver_id: string | null;
  attempt_started_at: string | null;
  created_at: string;
};

type EligibleDriver = {
  driver_id: string;
  driver_name: string;
  route_id: string;
  distance_meters: number;
};

/**
 * Finds all active drivers active in the last 30 minutes, 
 * calculates their PostGIS Great-Circle distance to the customer,
 * and filters for drivers whose active route is under 50% complete.
 */
export async function findNearestEligibleDrivers(customerId: string): Promise<EligibleDriver[]> {
  const sql = `
    WITH driver_last_gps AS (
      SELECT DISTINCT ON (driver_id) 
        driver_id, 
        location, 
        recorded_at
      FROM gps_tracking
      WHERE recorded_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY driver_id, recorded_at DESC
    ),
    active_route_completion AS (
      SELECT 
        r.route_id, 
        r.driver_id,
        COUNT(rs.stop_id) as total_stops,
        COUNT(CASE WHEN rs.status IN ('completed', 'skipped') THEN 1 END) as completed_stops
      FROM routes r
      JOIN route_stops rs ON rs.route_id = r.route_id
      WHERE r.status = 'in_progress' AND r.deleted_at IS NULL
      GROUP BY r.route_id, r.driver_id
    )
    SELECT 
      dlg.driver_id,
      d.name as driver_name,
      arc.route_id,
      ST_Distance(dlg.location, (SELECT location FROM customers WHERE customer_id = $1)) as distance_meters
    FROM driver_last_gps dlg
    JOIN drivers d ON d.driver_id = dlg.driver_id
    JOIN active_route_completion arc ON arc.driver_id = dlg.driver_id
    WHERE d.status = 'active'
      AND d.deleted_at IS NULL
      AND (arc.total_stops = 0 OR (arc.completed_stops * 100.0 / arc.total_stops) < 50.0)
    ORDER BY distance_meters ASC;
  `;

  const { rows } = await query<EligibleDriver>(sql, [customerId]);
  return rows;
}

/**
 * Notifies the specific driver of the pending emergency request.
 */
async function notifyDriver(requestId: string, driver: EligibleDriver): Promise<void> {
  const title = '🚨 URGENT EMERGENCY PLOW REQUEST';
  const body = `Emergency plowing requested nearby. You are the closest active crew. Open to accept or decline.`;
  const data = {
    category: 'urgent',
    requestId,
    routeId: driver.route_id,
  };

  logger.info(`[URGENT NOTIFICATION] Dispatching push to driver ${driver.driver_name} (${driver.driver_id}) for request ${requestId}`);
  await enqueuePushNotification(driver.driver_id, title, body, data);
}

/**
 * Escalates the emergency plowing request to the next nearest eligible driver.
 */
export async function escalateUrgentRequest(requestId: string): Promise<void> {
  const { rows } = await query<UrgentRequest>(
    'SELECT * FROM urgent_requests WHERE request_id = $1',
    [requestId]
  );

  const request = rows[0];
  if (!request || request.status !== 'pending') {
    logger.info(`[ESCALATION TERMINATED] Request ${requestId} is no longer pending or does not exist.`);
    return;
  }

  // Retrieve drivers and index from Redis
  const driversKey = `plowpath:urgent:${requestId}:drivers`;
  const indexKey = `plowpath:urgent:${requestId}:current_idx`;

  const driversStr = await redis.get(driversKey);
  const indexStr = await redis.get(indexKey);

  if (!driversStr || !indexStr) {
    logger.warn(`[ESCALATION ERROR] Redis keys missing for request ${requestId}. Expiring request.`);
    await query(
      "UPDATE urgent_requests SET status = 'expired', updated_at = NOW() WHERE request_id = $1",
      [requestId]
    );
    return;
  }

  const drivers = JSON.parse(driversStr) as EligibleDriver[];
  const currentIndex = parseInt(indexStr, 10);

  // Mark the previous driver's attempt as declined/skipped
  if (currentIndex > 0) {
    logger.info(`[ESCALATION TIMEOUT] Driver at index ${currentIndex - 1} timed out for request ${requestId}. Escalating...`);
  }

  if (currentIndex >= drivers.length) {
    logger.info(`[ESCALATION EXHAUSTED] All eligible drivers exhausted for request ${requestId}. Expiring request.`);
    await query(
      "UPDATE urgent_requests SET status = 'expired', updated_at = NOW() WHERE request_id = $1",
      [requestId]
    );
    // Broadcast status to dashboard
    broadcastUrgentRequestUpdate({ requestId, status: 'expired' });
    
    // Notify customer via Twilio SMS that no crew was currently available
    const { rows: custRows } = await query<{ phone: string; name: string }>(
      'SELECT phone, name FROM customers WHERE customer_id = $1',
      [request.customer_id]
    );
    if (custRows[0]?.phone) {
      await sendSms({
        to: custRows[0].phone,
        body: `PlowPath Alert: We are sorry, but all of our active crews are currently fully booked. We have escalated your emergency request to our office manager.`,
      });
    }
    return;
  }

  const targetDriver = drivers[currentIndex];
  
  // Update attempts
  await query(
    'UPDATE urgent_requests SET attempt_started_at = NOW(), updated_at = NOW() WHERE request_id = $1',
    [requestId]
  );
  
  // Increment index in Redis
  await redis.set(indexKey, (currentIndex + 1).toString(), 'EX', 3600);

  // Dispatch the notification
  await notifyDriver(requestId, targetDriver);

  // Broadcast current state to dashboard
  broadcastUrgentRequestUpdate({
    requestId,
    status: 'pending',
    driverName: targetDriver.driver_name,
    distanceMeters: targetDriver.distance_meters,
    attempt: currentIndex + 1,
    maxAttempts: drivers.length,
    expiresInSeconds: 300 // 5 minutes timer
  });

  // Schedule the next escalation job in Bull queue (5 minutes delay = 300,000 ms)
  const URGENT_TIMEOUT_MS = parseInt(process.env.URGENT_TIMEOUT_SECONDS || '300', 10) * 1000;
  await urgentEscalationQueue.add(
    { requestId },
    {
      delay: URGENT_TIMEOUT_MS,
      jobId: `escalate:${requestId}:${currentIndex + 1}`,
      removeOnComplete: true,
    }
  );
}

/**
 * Handles driver acceptance of the emergency plowing request.
 * Appends the customer to the driver's route in-place and re-optimizes.
 */
export async function acceptUrgentRequest(requestId: string, driverId: string): Promise<void> {
  const { rows } = await query<UrgentRequest>(
    'SELECT * FROM urgent_requests WHERE request_id = $1',
    [requestId]
  );

  const request = rows[0];
  if (!request) {
    throw new Error('Urgent request not found');
  }
  if (request.status !== 'pending') {
    throw new Error('This request has already been claimed, declined, or has expired');
  }

  // Update status in Database
  await query(
    `UPDATE urgent_requests 
     SET status = 'assigned', assigned_driver_id = $1, updated_at = NOW() 
     WHERE request_id = $2`,
    [driverId, requestId]
  );

  // Cancel any pending Bull escalation jobs for this request
  const currentIndexStr = await redis.get(`plowpath:urgent:${requestId}:current_idx`);
  if (currentIndexStr) {
    const currentIndex = parseInt(currentIndexStr, 10);
    const jobId = `escalate:${requestId}:${currentIndex}`;
    const job = await urgentEscalationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`[ESCALATION CANCELLED] Cancelled pending Bull job ${jobId} for request ${requestId}`);
    }
  }

  // Find the driver's active route
  const { rows: routeRows } = await query<{ route_id: string }>(
    "SELECT route_id FROM routes WHERE driver_id = $1 AND status = 'in_progress' AND deleted_at IS NULL LIMIT 1",
    [driverId]
  );

  const activeRoute = routeRows[0];
  if (!activeRoute) {
    throw new Error('Driver does not have an active route in progress');
  }

  // Find current sequence position: insert immediately after their current active stop or completed stop
  const { rows: currentStops } = await query<{ sequence_number: number; status: string }>(
    `SELECT sequence_number, status FROM route_stops 
     WHERE route_id = $1 
     ORDER BY sequence_number ASC`,
    [activeRoute.route_id]
  );

  let insertSequence = 1;
  const lastDoneStop = [...currentStops]
    .reverse()
    .find((s) => s.status === 'completed' || s.status === 'in_progress');

  if (lastDoneStop) {
    insertSequence = lastDoneStop.sequence_number + 1;
  }

  // Shift all subsequent stops by +1
  await query(
    `UPDATE route_stops 
     SET sequence_number = sequence_number + 1, updated_at = NOW() 
     WHERE route_id = $1 AND sequence_number >= $2`,
    [activeRoute.route_id, insertSequence]
  );

  // Insert the new emergency stop
  await query(
    `INSERT INTO route_stops (route_id, customer_id, sequence_number, status, created_at, updated_at) 
     VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
    [activeRoute.route_id, request.customer_id, insertSequence]
  );

  logger.info(`[EMERGENCY ADDED] Inserted stop for customer ${request.customer_id} into route ${activeRoute.route_id} at sequence ${insertSequence}`);

  // Broadcast route update via Socket.io
  broadcastRouteUpdate({ route_id: activeRoute.route_id, status: 'in_progress', driver_id: driverId });
  broadcastUrgentRequestUpdate({ requestId, status: 'assigned', driverId });

  // Cleanup Redis keys
  await redis.del(`plowpath:urgent:${requestId}:drivers`);
  await redis.del(`plowpath:urgent:${requestId}:current_idx`);

  // SMS the customer the assigned driver details using the recommended Twilio Anonymous Proxy
  const { rows: custRows } = await query<{ phone: string; name: string }>(
    'SELECT phone, name FROM customers WHERE customer_id = $1',
    [request.customer_id]
  );
  const { rows: driverRows } = await query<{ name: string }>(
    'SELECT name FROM drivers WHERE driver_id = $1',
    [driverId]
  );

  if (custRows[0]?.phone && driverRows[0]?.name) {
    const twilioProxyNumber = env.TWILIO_PHONE_NUMBER || 'our office line';
    await sendSms({
      to: custRows[0].phone,
      body: `PlowPath Urgent Alert: Your emergency service request has been accepted by crew "${driverRows[0].name}"! They are currently en route. To coordinate, call our masked office proxy at ${twilioProxyNumber}.`,
    });
  }
}

/**
 * Handles driver declining the emergency request. 
 * Instantly triggers escalation to the next driver.
 */
export async function declineUrgentRequest(requestId: string, driverId: string): Promise<void> {
  logger.info(`[URGENT DECLINE] Driver ${driverId} declined request ${requestId}. Escalating immediately...`);
  
  // Cancel current Bull timeout job
  const currentIndexStr = await redis.get(`plowpath:urgent:${requestId}:current_idx`);
  if (currentIndexStr) {
    const currentIndex = parseInt(currentIndexStr, 10);
    const jobId = `escalate:${requestId}:${currentIndex}`;
    const job = await urgentEscalationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`[ESCALATION CANCELLED] Cancelled timed job ${jobId} due to immediate decline`);
    }
  }

  // Trigger next driver escalation immediately
  await escalateUrgentRequest(requestId);
}

// 6. Bull queue processor for timeouts
urgentEscalationQueue.process(async (job) => {
  const { requestId } = job.data;
  logger.info(`[BULL ESCALATION PROCESS] Processing timeout check for request ${requestId}`);
  await escalateUrgentRequest(requestId);
});
