import type { Request, Response } from 'express';
import { query } from '../config/db';
import { logger } from '../utils/logger';
import { generateIvrResponse, generateSmsResponse } from '../services/twilio.service';

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
 * Processes DTMF keypresses and updates next_service_decision.
 */
export async function handleVoiceCall(req: Request, res: Response): Promise<void> {
  const fromNumber = req.body.From || '';
  const digits = req.body.Digits;

  logger.info(`[IVR CALL] Incoming voice webhook from: ${fromNumber} | Digits pressed: ${digits || 'None'}`);

  if (digits) {
    const rawDigits = String(digits).trim();
    const rawCleaned = cleanPhoneNumber(fromNumber);

    // Try to find matching customer
    const { rows } = await query<{ customer_id: string; name: string }>(
      `SELECT customer_id, name FROM customers 
       WHERE (phone = $1 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $3)
         AND deleted_at IS NULL`,
      [fromNumber, rawCleaned, '1' + rawCleaned],
    );

    const customer = rows[0];
    if (customer) {
      let decision: string | null = null;
      if (rawDigits === '1') {
        decision = 'confirm';
      } else if (rawDigits === '2') {
        decision = 'skip';
      }

      if (decision) {
        await query(
          'UPDATE customers SET next_service_decision = $1, updated_at = NOW() WHERE customer_id = $2',
          [decision, customer.customer_id],
        );
        logger.info(`[IVR UPDATE] Customer "${customer.name}" (${customer.customer_id}) selected: ${decision}`);
      }
    } else {
      logger.warn(`[IVR MATCH FAILED] Caller number ${fromNumber} (cleaned: ${rawCleaned}) did not match any active customer roster`);
    }
  }

  // Generate and return TwiML response
  const xmlResponse = generateIvrResponse(digits);
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
