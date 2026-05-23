import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { handleVoiceCall, handleInboundSms, handleSmsStatus } from '../controllers/twilio.controller';

const router = Router();

// Unauthenticated webhooks called directly by Twilio carrier services
router.post('/voice', asyncHandler(handleVoiceCall));
router.post('/sms', asyncHandler(handleInboundSms));
router.post('/sms-status', asyncHandler(handleSmsStatus));

export default router;
