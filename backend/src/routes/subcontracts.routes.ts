import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  broadcastOffer,
  listActiveOffers,
  getOfferDetails,
  acceptOffer,
  submitProof,
} from '../controllers/subcontracts.controller';

const router = Router();

router.use(authenticate);

// Dispatcher endpoints for B2B sharing
router.post('/broadcast', requireRole('owner', 'manager'), broadcastOffer);
router.get('/active', requireRole('owner', 'manager'), listActiveOffers);
router.get('/:id', getOfferDetails); // Both dispatchers and drivers need details
router.post('/:id/accept', requireRole('owner', 'manager'), acceptOffer);

// Driver endpoints for completed partner stops
router.post('/stops/:stopId/proof', requireRole('driver'), submitProof);

export default router;
