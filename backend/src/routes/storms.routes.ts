import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { create, getOne, list, remove, update } from '../controllers/storms.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getOne));
router.post('/', requireRole('owner', 'manager'), asyncHandler(create));
router.put('/:id', requireRole('owner', 'manager'), asyncHandler(update));
router.delete('/:id', requireRole('owner'), asyncHandler(remove));

export default router;
