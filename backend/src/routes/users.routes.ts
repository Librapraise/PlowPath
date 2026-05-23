import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { me } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);
router.get('/me', asyncHandler(me));

export default router;
