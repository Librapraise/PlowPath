import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('owner', 'manager'), asyncHandler(getSettings));
router.put('/', requireRole('owner', 'manager'), asyncHandler(updateSettings));

export default router;
