import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

// Protect all analytics endpoints behind authentication and owner/manager roles
router.use(authenticate);
router.use(requireRole('owner', 'manager'));

router.get('/seasonal', asyncHandler(analyticsController.getSeasonalAnalytics));
router.get('/storm/:stormId', asyncHandler(analyticsController.getStormAnalytics));
router.get('/driver/rankings', asyncHandler(analyticsController.getDriverRankings));
router.get('/driver/:driverId', asyncHandler(analyticsController.getDriverAnalytics));
router.get('/forecast/seasonal', asyncHandler(analyticsController.getSeasonalForecast));
router.get('/forecast/crew-size', asyncHandler(analyticsController.getCrewSizeRecommendation));
router.get('/forecast/pricing', asyncHandler(analyticsController.getPricingOptimizations));
router.get('/export', asyncHandler(analyticsController.exportFinancialsCsv));

export default router;
