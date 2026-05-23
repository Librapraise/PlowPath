import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { driverHistory, ingest, latestForAll } from '../controllers/tracking.controller';

const router = Router();
router.use(authenticate);

router.post('/', asyncHandler(ingest));
router.get('/latest', asyncHandler(latestForAll));
router.get('/driver/:id', asyncHandler(driverHistory));

export default router;
