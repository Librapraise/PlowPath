import type { Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import * as analyticsService from '../services/analytics.service';

// 🌪️ GET /api/v1/analytics/storm/:stormId
export async function getStormAnalytics(req: Request, res: Response): Promise<void> {
  const { stormId } = req.params;
  if (!stormId) {
    throw HttpError.badRequest('Storm ID is required');
  }

  try {
    const data = await analyticsService.getStormFinancials(stormId);
    res.json(data);
  } catch (err: any) {
    throw HttpError.notFound(err.message || 'Storm analytics not found');
  }
}

// 🗓️ GET /api/v1/analytics/seasonal
export async function getSeasonalAnalytics(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSeasonalAnalytics();
  res.json(data);
}

// 🚜 GET /api/v1/analytics/driver/rankings
export async function getDriverRankings(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getDriverRankings();
  res.json(data);
}

// 🚜 GET /api/v1/analytics/driver/:driverId
export async function getDriverAnalytics(req: Request, res: Response): Promise<void> {
  const { driverId } = req.params;
  if (!driverId) {
    throw HttpError.badRequest('Driver ID is required');
  }

  const rankings = await analyticsService.getDriverRankings();
  const driverPerformance = rankings.find((d) => d.driver_id === driverId);

  if (!driverPerformance) {
    throw HttpError.notFound('Driver performance record not found or driver inactive');
  }

  res.json(driverPerformance);
}

// 🔮 GET /api/v1/analytics/forecast/seasonal
export async function getSeasonalForecast(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSeasonalForecast();
  res.json(data);
}

// 🔮 GET /api/v1/analytics/forecast/crew-size
export async function getCrewSizeRecommendation(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getCrewSizeRecommendation();
  res.json(data);
}

// 🔮 GET /api/v1/analytics/forecast/pricing
export async function getPricingOptimizations(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getPricingOptimizations();
  res.json(data);
}

// 📤 GET /api/v1/analytics/export
export async function exportFinancialsCsv(req: Request, res: Response): Promise<void> {
  const seasonalMetrics = await analyticsService.getSeasonalAnalytics();

  let csvContent = 'Storm Name,Status,Start Time,End Time,Forecasted Acc (in),Actual Acc (in),Completed Stops,Total Distance (mi),Total Labor Hours,Gross Revenue ($),Labor Cost ($),Fuel Cost ($),Direct Costs ($),Gross Margin ($),Overhead Allocation ($),Net Margin ($)\n';

  for (const s of seasonalMetrics) {
    const name = s.name.replace(/"/g, '""');
    const status = s.status;
    const start = s.start_time ?? '';
    const end = s.end_time ?? '';
    csvContent += `"${name}","${status}","${start}","${end}",${s.forecasted_accumulation},${s.actual_accumulation},${s.completed_stops},${s.total_distance_mi},${s.total_labor_hours},${s.revenue},${s.labor_cost},${s.fuel_cost},${s.direct_costs},${s.gross_margin},${s.overhead_allocation},${s.net_margin}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=plowpath_financials_export.csv');
  res.status(200).send(csvContent);
}
