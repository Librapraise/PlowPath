import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let twilioClient: twilio.Twilio | null = null;
let twilioInitialized = false;

// 1. Safely initialize Twilio if credentials are provided in the environment
const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const fromPhone = env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken && fromPhone) {
  try {
    twilioClient = twilio(accountSid, authToken);
    twilioInitialized = true;
    logger.info('Twilio SMS and Voice SDK initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Twilio SDK', err);
  }
} else {
  logger.warn('Twilio environment variables are missing; SMS notifications will run in MOCK / DRY RUN mode.');
}

export interface SmsPayload {
  to: string;
  body: string;
}

/**
 * Dispatches an SMS message. If Twilio keys are missing,
 * it gracefully prints a high-fidelity console mock alert.
 */
export async function sendSms(payload: SmsPayload): Promise<{ sid?: string; mock: boolean }> {
  const { to, body } = payload;

  if (!twilioInitialized || !twilioClient) {
    logger.info(`[MOCK SMS DISPATCH] To: ${to} | Body: "${body}"`);
    return { mock: true, sid: `mock-sid-${Date.now()}` };
  }

  try {
    const message = await twilioClient.messages.create({
      to,
      from: fromPhone,
      body,
    });
    logger.info(`Successfully dispatched live SMS via Twilio to ${to}. SID: ${message.sid}`);
    return { mock: false, sid: message.sid };
  } catch (err) {
    logger.error(`Failed to dispatch Twilio SMS to ${to}`, err);
    throw err;
  }
}

/**
 * Generates custom TwiML XML markup for inbound IVR phone menus and DTMF callback updates.
 */
export function generateIvrResponse(digit?: string, greetingText?: string): string {
  const twiml = new twilio.twiml.VoiceResponse();

  if (!digit) {
    if (greetingText) {
      twiml.say({ voice: 'Polly.Joey' as any }, greetingText);
    }

    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/v1/webhooks/twilio/voice',
      method: 'POST',
      timeout: 10,
    });
    
    gather.say(
      { voice: 'Polly.Joey' as any },
      'Please press 1 to request emergency plowing service. ' +
      'Press 2 for your status updates and service confirmation options. ' +
      'Or press 3 for all other inquiries.'
    );
    
    // Fallback if no digit is pressed
    twiml.say({ voice: 'Polly.Joey' as any }, 'We did not receive any input. Goodbye.');
    twiml.hangup();
  } else if (digit === '1') {
    twiml.say(
      { voice: 'Polly.Joey' as any },
      'Thank you. We have logged your emergency request. Our dispatch team is locating the closest active crew to route to your property. ' +
      'We will send you an SMS alert with driver details as soon as they confirm. Goodbye!'
    );
    twiml.hangup();
  } else if (digit === '2') {
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/v1/webhooks/twilio/voice/status-decision',
      method: 'POST',
      timeout: 10,
    });
    
    gather.say(
      { voice: 'Polly.Joey' as any },
      'Please press 1 to confirm your service request for this storm, or press 2 to skip this storm.'
    );
    
    twiml.say({ voice: 'Polly.Joey' as any }, 'We did not receive any input. Goodbye.');
    twiml.hangup();
  } else if (digit === '3') {
    twiml.say(
      { voice: 'Polly.Joey' as any },
      'For all other inquiries, please contact our support team at support at plow path dot app, or call our business office during normal operating hours. Goodbye!'
    );
    twiml.hangup();
  } else {
    // Handle invalid keypresses gracefully
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/v1/webhooks/twilio/voice',
      method: 'POST',
      timeout: 10,
    });
    
    gather.say(
      { voice: 'Polly.Joey' as any },
      'Invalid entry. Please press 1 to request emergency service. Press 2 for status options. Press 3 for other inquiries.'
    );
    
    twiml.say({ voice: 'Polly.Joey' as any }, 'We did not receive any input. Goodbye.');
    twiml.hangup();
  }

  return twiml.toString();
}

/**
 * Generates custom TwiML for the nested confirm/skip status decision IVR sub-menu.
 */
export function generateIvrStatusDecisionResponse(digit?: string): string {
  const twiml = new twilio.twiml.VoiceResponse();

  if (digit === '1') {
    twiml.say(
      { voice: 'Polly.Joey' as any },
      'Thank you! Your snow removal service is confirmed. Our crew will see you soon. Goodbye!'
    );
    twiml.hangup();
  } else if (digit === '2') {
    twiml.say(
      { voice: 'Polly.Joey' as any },
      'Thank you! You have opted to skip this storm. We will not clear your property for this event. Goodbye!'
    );
    twiml.hangup();
  } else {
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/v1/webhooks/twilio/voice/status-decision',
      method: 'POST',
      timeout: 10,
    });
    
    gather.say(
      { voice: 'Polly.Joey' as any },
      'Invalid entry. Please press 1 to confirm your service, or press 2 to skip.'
    );
    
    twiml.say({ voice: 'Polly.Joey' as any }, 'We did not receive any input. Goodbye.');
    twiml.hangup();
  }

  return twiml.toString();
}

/**
 * Generates response for inbound SMS keywords.
 */
export function generateSmsResponse(body: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  const normalized = body.trim().toUpperCase();

  if (normalized === 'STOP' || normalized === 'UNSUBSCRIBE') {
    twiml.message('You have been successfully unsubscribed from PlowPath alerts. Reply START to re-enable.');
  } else if (normalized === 'HELP') {
    twiml.message('PlowPath Alerts: Receive snow clearing updates. Reply STOP to opt-out, or email support at plowpath.ca.');
  } else if (normalized === 'START') {
    twiml.message('Welcome back to PlowPath alerts! You have successfully re-subscribed.');
  } else {
    twiml.message('PlowPath: We received your message. For automated options, please reply HELP or call our main line.');
  }

  return twiml.toString();
}
