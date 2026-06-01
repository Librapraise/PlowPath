import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Lazy-initialized SMTP transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT || 587,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      logger.info('Nodemailer SMTP Transporter initialized successfully');
      return transporter;
    } catch (err) {
      logger.error('Failed to initialize Nodemailer SMTP Transporter:', err);
      return null;
    }
  }

  return null;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email. If SMTP credentials are not configured,
 * it runs in mock mode and logs the contents.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ messageId?: string; mock: boolean }> {
  const { to, subject, html } = payload;
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Subject: "${subject}"`);
    logger.debug(`[MOCK EMAIL HTML CONTENT]:\n${html}`);
    return { mock: true };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: env.MAIL_FROM || 'PlowPath Security <security@plowpath.app>',
      to,
      subject,
      html,
    });
    logger.info(`Successfully dispatched email to ${to}. Message ID: ${info.messageId}`);
    return { messageId: info.messageId, mock: false };
  } catch (err) {
    logger.error(`Failed to dispatch email to ${to}`, err);
    throw err;
  }
}
