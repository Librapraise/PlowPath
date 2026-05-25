import type { Request, Response } from 'express';
import { query } from '../config/db';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { generateIvrResponse, generateIvrStatusDecisionResponse, generateSmsResponse } from '../services/twilio.service';
import { escalateUrgentRequest, findNearestEligibleDrivers } from '../services/ivr.service';

/**
 * Normalizes phone numbers to a digits-only format for robust database matching.
 */
function cleanPhoneNumber(phone: string): string {
  // Strip any non-digit characters. E.g. +1 (555) 123-4567 -> 15551234567
  const cleaned = phone.replace(/\D/g, '');
  // If number starts with 1 and is 11 digits, we also support matching the 10-digit suffix
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Webhook endpoint for inbound IVR phone calls.
 * Processes DTMF keypresses and logs call events inside call_logs.
 */
export async function handleVoiceCall(req: Request, res: Response): Promise<void> {
  const fromNumber = req.body.From || '';
  const digits = req.body.Digits;
  const rawCleaned = cleanPhoneNumber(fromNumber);

  logger.info(`[IVR CALL] Inbound voice webhook from: ${fromNumber} | Digits pressed: ${digits || 'None'}`);

  // 1. Resolve Customer ID from Phone number
  const { rows: custRows } = await query<{ customer_id: string; name: string }>(
    `SELECT customer_id, name FROM customers 
     WHERE (phone = $1 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $3)
       AND deleted_at IS NULL`,
    [fromNumber, rawCleaned, '1' + rawCleaned],
  );
  const customer = custRows[0];
  const customerId = customer?.customer_id || null;

  // 2. Logging interaction in database
  await query(
    'INSERT INTO call_logs (from_number, customer_id, dtmf_pressed, recorded_at) VALUES ($1, $2, $3, NOW())',
    [fromNumber, customerId, digits ? String(digits) : null]
  );

  // 3. First-run response (no DTMF keys pressed yet)
  if (!digits) {
    let greetingText = '';

    if (customer) {
      // Find if this customer is assigned to an active route
      const { rows: stopRows } = await query<{
        sequence_number: number;
        route_id: string;
        driver_name: string;
      }>(
        `SELECT 
           rs.sequence_number,
           r.route_id,
           d.name as driver_name
         FROM route_stops rs
         JOIN routes r ON r.route_id = rs.route_id
         LEFT JOIN drivers d ON d.driver_id = r.driver_id
         WHERE rs.customer_id = $1
           AND r.status IN ('assigned', 'in_progress')
           AND r.deleted_at IS NULL
         ORDER BY r.created_at DESC
         LIMIT 1`,
        [customer.customer_id]
      );

      const activeStop = stopRows[0];
      if (activeStop) {
        // Count stops ahead of this customer in the route sequence
        const { rows: countRows } = await query<{ count: string }>(
          `SELECT COUNT(stop_id) as count FROM route_stops 
           WHERE route_id = $1 
             AND sequence_number < $2 
             AND status IN ('pending', 'in_progress')`,
          [activeStop.route_id, activeStop.sequence_number]
        );
        const count = parseInt(countRows[0].count, 10);
        const etaMinutes = Math.max(10, count * 15); // assume 15 min per pending stop

        greetingText = `Hello ${customer.name}! Your property is scheduled for plowing. You are stop number ${activeStop.sequence_number} on ${activeStop.driver_name || 'your crew'}'s route. There are ${count} stops ahead of you. We estimate our crew will arrive in approximately ${etaMinutes} minutes.`;
      } else {
        greetingText = `Hello ${customer.name}! We have located your profile. However, there are no active snow routes scheduled for your property right now.`;
      }
    } else {
      greetingText = `Hello! Thank you for calling PlowPath. We could not locate your phone number in our customer database.`;
    }

    const xmlResponse = generateIvrResponse(undefined, greetingText);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xmlResponse);
    return;
  }

  // 4. Handle DTMF digits
  const rawDigits = String(digits).trim();

  if (rawDigits === '1') {
    // EMERGENCY REQUEST
    const { rows: stormRows } = await query<{ storm_id: string }>(
      "SELECT storm_id FROM storm_events WHERE status = 'active' LIMIT 1"
    );
    const activeStorm = stormRows[0];

    if (customerId && activeStorm) {
      // Create a pending urgent request
      const { rows: reqRows } = await query<{ request_id: string }>(
        `INSERT INTO urgent_requests (customer_id, storm_id, status, created_at) 
         VALUES ($1, $2, 'pending', NOW()) RETURNING request_id`,
        [customerId, activeStorm.storm_id]
      );
      const urgentRequest = reqRows[0];

      // Spatial haversine match for nearest active driver
      const eligibleDrivers = await findNearestEligibleDrivers(customerId);
      if (eligibleDrivers.length === 0) {
        logger.warn(`[EMERGENCY FAIL] No eligible drivers found near customer ${customerId}`);
        await query(
          "UPDATE urgent_requests SET status = 'expired', updated_at = NOW() WHERE request_id = $1",
          [urgentRequest.request_id]
        );
        
        // Speak: "No drivers available"
        const twiml = new (require('twilio').twiml.VoiceResponse)();
        twiml.say(
          { voice: 'Polly.Joey' },
          'We are sorry, but all of our plowing crews are currently fully booked. We have flagged your request for emergency review. Goodbye!'
        );
        twiml.hangup();
        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml.toString());
        return;
      }

      // Store in Redis for the escalation queue
      await redis.set(`plowpath:urgent:${urgentRequest.request_id}:drivers`, JSON.stringify(eligibleDrivers), 'EX', 3600);
      await redis.set(`plowpath:urgent:${urgentRequest.request_id}:current_idx`, '0', 'EX', 3600);

      // Trigger initial driver notification
      void escalateUrgentRequest(urgentRequest.request_id);
    } else {
      logger.warn(`[EMERGENCY MATCH FAILED] Caller number ${fromNumber} not matched or no active storm event.`);
    }

    const xmlResponse = generateIvrResponse('1');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xmlResponse);
  } else if (rawDigits === '2') {
    // STATUS CONFIRM / SKIP nested menu
    const xmlResponse = generateIvrResponse('2');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xmlResponse);
  } else if (rawDigits === '3') {
    // OTHER INQUIRIES
    const xmlResponse = generateIvrResponse('3');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xmlResponse);
  } else {
    // INVALID INPUT
    const xmlResponse = generateIvrResponse(undefined, 'Invalid option.');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xmlResponse);
  }
}

/**
 * Webhook endpoint for inbound IVR nested status decisions.
 * Handles the confirm/skip menu selection and updates customer next_service_decision.
 */
export async function handleVoiceStatusDecision(req: Request, res: Response): Promise<void> {
  const fromNumber = req.body.From || '';
  const digits = req.body.Digits;
  const rawCleaned = cleanPhoneNumber(fromNumber);

  logger.info(`[IVR STATUS DECISION] Webhook from: ${fromNumber} | Digits pressed: ${digits || 'None'}`);

  // Retrieve customer
  const { rows } = await query<{ customer_id: string }>(
    `SELECT customer_id FROM customers 
     WHERE (phone = $1 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $3)
       AND deleted_at IS NULL`,
    [fromNumber, rawCleaned, '1' + rawCleaned],
  );
  
  const customer = rows[0];
  if (customer && digits) {
    const key = String(digits).trim();
    let decision: string | null = null;
    if (key === '1') {
      decision = 'confirm';
    } else if (key === '2') {
      decision = 'skip';
    }

    if (decision) {
      await query(
        'UPDATE customers SET next_service_decision = $1, updated_at = NOW() WHERE customer_id = $2',
        [decision, customer.customer_id],
      );
      // Log decisionDTMF inside call_logs
      await query(
        'INSERT INTO call_logs (from_number, customer_id, dtmf_pressed, recorded_at) VALUES ($1, $2, $3, NOW())',
        [fromNumber, customer.customer_id, `decision:${decision}`]
      );
      logger.info(`[IVR DECISION LOGGED] Customer ${customer.customer_id} updated next_service_decision: ${decision}`);
    }
  }

  const xmlResponse = generateIvrStatusDecisionResponse(digits);
  res.set('Content-Type', 'text/xml');
  res.status(200).send(xmlResponse);
}

/**
 * Webhook endpoint for inbound SMS messages.
 * Manages the HELP, START, and STOP legal opt-out keywords.
 */
export async function handleInboundSms(req: Request, res: Response): Promise<void> {
  const fromNumber = req.body.From || '';
  const messageBody = (req.body.Body || '').trim();
  const normalizedKeyword = messageBody.toUpperCase();

  logger.info(`[INBOUND SMS] From: ${fromNumber} | Body: "${messageBody}"`);

  const rawCleaned = cleanPhoneNumber(fromNumber);

  // Check if this is a legal opt-out or resubscribe keyword
  const isStop = normalizedKeyword === 'STOP' || normalizedKeyword === 'UNSUBSCRIBE';
  const isStart = normalizedKeyword === 'START' || normalizedKeyword === 'RESUBSCRIBE';

  if (isStop || isStart) {
    // Locate the customer matching the phone number
    const { rows } = await query<{ customer_id: string; name: string }>(
      `SELECT customer_id, name FROM customers 
       WHERE (phone = $1 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $3)
         AND deleted_at IS NULL`,
      [fromNumber, rawCleaned, '1' + rawCleaned],
    );

    const customer = rows[0];
    if (customer) {
      if (isStop) {
        await query(
          'UPDATE customers SET notify_sms = FALSE, sms_opt_out_at = NOW(), updated_at = NOW() WHERE customer_id = $1',
          [customer.customer_id],
        );
        logger.info(`[SMS OPT-OUT] Customer "${customer.name}" (${customer.customer_id}) successfully opted out of SMS broadcasts`);
      } else if (isStart) {
        await query(
          'UPDATE customers SET notify_sms = TRUE, sms_opt_out_at = NULL, updated_at = NOW() WHERE customer_id = $1',
          [customer.customer_id],
        );
        logger.info(`[SMS OPT-IN] Customer "${customer.name}" (${customer.customer_id}) successfully opted back into SMS broadcasts`);
      }
    } else {
      logger.warn(`[SMS KEYWORD MATCH FAILED] Number ${fromNumber} did not match any active customer roster`);
    }
  }

  // Generate and return TwiML response
  const xmlResponse = generateSmsResponse(messageBody);
  res.set('Content-Type', 'text/xml');
  res.status(200).send(xmlResponse);
}

/**
 * Webhook endpoint for tracking outbound SMS delivery statuses.
 */
export async function handleSmsStatus(req: Request, res: Response): Promise<void> {
  const sid = req.body.MessageSid;
  const status = req.body.MessageStatus;
  const to = req.body.To;
  const errorCode = req.body.ErrorCode;

  logger.info(`[SMS STATUS WEBHOOK] SID: ${sid} | Status: ${status} | To: ${to} | ErrorCode: ${errorCode || 'None'}`);

  res.status(200).json({ success: true });
}
