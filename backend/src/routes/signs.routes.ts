import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { getSignRoute, updateSignStatus } from '../controllers/signs.controller';

const router = Router();
router.use(authenticate);

router.get('/route', asyncHandler(getSignRoute));
router.put('/customers/:customerId/sign', asyncHandler(updateSignStatus));

export default router;
