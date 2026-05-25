import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  create,
  getOne,
  list,
  remove,
  update,
  geocodePreview,
  listPayments,
  createPayment,
  getCustomerHistory,
  exportCsv,
  importCsv,
} from '../controllers/customers.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(list));
router.get('/export', requireRole('owner', 'manager'), asyncHandler(exportCsv));
router.post('/import', requireRole('owner', 'manager'), asyncHandler(importCsv));
router.get('/geocode/preview', requireRole('owner', 'manager'), asyncHandler(geocodePreview));
router.get('/:id', asyncHandler(getOne));
router.post('/', requireRole('owner', 'manager'), asyncHandler(create));
router.put('/:id', requireRole('owner', 'manager'), asyncHandler(update));
router.delete('/:id', requireRole('owner', 'manager'), asyncHandler(remove));

router.get('/:id/payments', asyncHandler(listPayments));
router.post('/:id/payments', requireRole('owner', 'manager'), asyncHandler(createPayment));
router.get('/:id/history', asyncHandler(getCustomerHistory));

export default router;
