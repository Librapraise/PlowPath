import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { generate, getOne, list, updateStop, updateRoute, broadcastSms } from '../controllers/routes.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getOne));
router.post('/generate', requireRole('owner', 'manager'), asyncHandler(generate));
router.post('/:id/broadcast-sms', requireRole('owner', 'manager'), asyncHandler(broadcastSms));
router.put('/:id/stops/:stopId', asyncHandler(updateStop));
router.put('/:id', asyncHandler(updateRoute));

export default router;
