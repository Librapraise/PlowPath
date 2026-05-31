import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { me, updatePassword, updateProfile } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);

router.get('/me', asyncHandler(me));
router.put('/me', asyncHandler(updateProfile));
router.put('/me/password', asyncHandler(updatePassword));

export default router;
