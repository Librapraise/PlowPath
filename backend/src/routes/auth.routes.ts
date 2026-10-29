import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authRateLimit } from '../middleware/rateLimit.middleware';
import { login, logout, refresh, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimit, asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.post('/forgot-password', authRateLimit, asyncHandler(forgotPassword));
router.post('/reset-password', authRateLimit, asyncHandler(resetPassword));

export default router;
