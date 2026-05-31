import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { create, getOne, list, remove, update, updateFcmToken } from '../controllers/drivers.controller';
import { getDriverSettings, updateDriverSettings } from '../controllers/settings.controller';
import { HttpError } from '../utils/httpError';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(list));
router.get('/me/settings', asyncHandler(getDriverSettings));
router.put('/me/settings', asyncHandler(updateDriverSettings));
router.get('/:id', asyncHandler(getOne));
router.post('/', requireRole('owner', 'manager'), asyncHandler(create));
router.put('/:id', asyncHandler(async (req, res) => {
  if (!req.user) throw HttpError.unauthorized();
  const isSelf = req.user.role === 'driver' && req.user.driverId === req.params.id;
  if (req.user.role !== 'owner' && req.user.role !== 'manager' && !isSelf) {
    throw HttpError.forbidden('Insufficient role');
  }
  await update(req, res);
}));
router.delete('/:id', requireRole('owner'), asyncHandler(remove));

router.post('/me/fcm-token', asyncHandler(updateFcmToken));

export default router;
