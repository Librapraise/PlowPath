import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  startShift,
  endShift,
  logHeartbeat,
  handleShiftHandover,
  getActiveShiftInfo,
  listActiveShifts,
  getHandoverToken,
} from '../controllers/shifts.controller';

const router = Router();

router.use(authenticate);

// Driver endpoints
router.post('/start', requireRole('driver'), startShift);
router.post('/end', requireRole('driver'), endShift);
router.post('/heartbeat', requireRole('driver'), logHeartbeat);
router.post('/handover', requireRole('driver'), handleShiftHandover);
router.get('/active', requireRole('driver'), getActiveShiftInfo);
router.get('/handover-token', requireRole('driver'), getHandoverToken);

// Dispatcher/manager/owner endpoints
router.get('/all-active', requireRole('owner', 'manager'), listActiveShifts);

export default router;
