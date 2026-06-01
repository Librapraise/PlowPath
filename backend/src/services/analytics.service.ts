import { query } from '../config/db';
import { logger } from '../utils/logger';

export interface StormFinancials {
  storm_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  forecasted_accumulation: number;
  actual_accumulation: number;
  status: string;
  completed_stops: number;
  total_distance_mi: number;
  total_labor_hours: number;
  revenue: number;
  labor_cost: number;
  fuel_cost: number;
  direct_costs: number;
  gross_margin: number;
  overhead_allocation: number;
  net_margin: number;
  fleet_utilization_percent: number;
}

export interface DriverPerformance {
  driver_id: string;
  name: string;
  completed_stops: number;
  labor_hours: number;
  properties_per_hour: number;
  hourly_rate: number;
  total_payout: number;
  vehicle_type: string;
}

export interface PricingCohortAlert {
  customer_id: string;
  customer_name: string;
  property_type: string;
  address: string;
  revenue_per_stop: number;
  allocated_cost_per_stop: number;
  profit_margin_percent: number;
  recommendation: string;
}

// 🧮 Retrieve dynamic financial settings with defaults
export async function getPricingSettings() {
  const { rows } = await query<any>('SELECT settings FROM organization_settings LIMIT 1');
  const defaults = {
    residential_rate: 50.0,
    commercial_rate: 150.0,
    fuel_price_per_gallon: 3.75,
    vehicle_mpg: 10.0,
    overhead_percentage: 15.0,
  };
  
  if (rows.length === 0 || !rows[0].settings) {
    return defaults;
  }
  
  const pricing = rows[0].settings.pricing || {};
  return {
    residential_rate: Number(pricing.residential_rate ?? defaults.residential_rate),
    commercial_rate: Number(pricing.commercial_rate ?? defaults.commercial_rate),
    fuel_price_per_gallon: Number(pricing.fuel_price_per_gallon ?? defaults.fuel_price_per_gallon),
    vehicle_mpg: Number(pricing.vehicle_mpg ?? defaults.vehicle_mpg),
    overhead_percentage: Number(pricing.overhead_percentage ?? defaults.overhead_percentage),
  };
}

// 🌪️ 1. Storm-Specific Financial Calculation Engine
export async function getStormFinancials(stormId: string): Promise<StormFinancials> {
  const pricing = await getPricingSettings();

  // Fetch storm details
  const stormRes = await query<any>(
    `SELECT storm_id, name, start_time, end_time, forecasted_accumulation, actual_accumulation, status
       FROM storm_events
      WHERE storm_id = $1 AND deleted_at IS NULL`,
    [stormId]
  );

  if (stormRes.rows.length === 0) {
    throw new Error('Storm event not found');
  }
  const s = stormRes.rows[0];

  // Fetch all routes for this storm, along with their drivers
  const routesRes = await query<any>(
    `SELECT r.route_id, r.driver_id, r.total_distance, r.start_time, r.end_time, d.hourly_rate
       FROM routes r
       JOIN drivers d ON r.driver_id = d.driver_id
      WHERE r.storm_id = $1 AND r.deleted_at IS NULL`,
    [stormId]
  );

  let completedStopsCount = 0;
  let residentialStopsCount = 0;
  let commercialStopsCount = 0;
  let totalDistance = 0;
  let totalLaborCost = 0;
  let totalLaborSeconds = 0;

  for (const r of routesRes.rows) {
    // 1. Accumulate Distance (MPG estimates)
    totalDistance += Number(r.total_distance ?? 0);

    // 2. Count completed stops and categorize by property type for revenue allocation
    const stopsRes = await query<any>(
      `SELECT rs.status, c.property_type
         FROM route_stops rs
         JOIN customers c ON rs.customer_id = c.customer_id
        WHERE rs.route_id = $1 AND rs.status = 'completed'`,
      [r.route_id]
    );

    completedStopsCount += stopsRes.rows.length;
    for (const stop of stopsRes.rows) {
      if (stop.property_type === 'commercial') {
        commercialStopsCount++;
      } else {
        residentialStopsCount++;
      }
    }

    // 3. Compute driver hours (shifts overlapping route or fallback to route timer)
    let activeSeconds = 0;
    
    // Attempt shift overlap lookup
    if (r.start_time) {
      const shiftRes = await query<any>(
        `SELECT cumulative_active_seconds, ended_at, started_at
           FROM driver_shifts
          WHERE driver_id = $1 
            AND started_at <= $2 
            AND (ended_at IS NULL OR ended_at >= $3)
            AND deleted_at IS NULL`,
        [r.driver_id, r.end_time || new Date(), r.start_time]
      );

      if (shiftRes.rows.length > 0) {
        // Use actual logged active shift seconds
        activeSeconds = Number(shiftRes.rows[0].cumulative_active_seconds || 0);
      }
    }

    // Fallback to route execution duration if no shifts overlap or shift seconds are 0
    if (activeSeconds === 0 && r.start_time) {
      const end = r.end_time ? new Date(r.end_time) : new Date();
      const start = new Date(r.start_time);
      activeSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    }

    const driverRate = Number(r.hourly_rate ?? 25.0);
    const routeHours = activeSeconds / 3600.0;

    totalLaborSeconds += activeSeconds;
    totalLaborCost += routeHours * driverRate;
  }

  // Revenue Math
  const revenue = (residentialStopsCount * pricing.residential_rate) + 
                  (commercialStopsCount * pricing.commercial_rate);

  // Fuel Costs Math
  const fuelGallons = totalDistance / pricing.vehicle_mpg;
  const fuelCost = fuelGallons * pricing.fuel_price_per_gallon;

  const directCosts = totalLaborCost + fuelCost;
  const grossMargin = revenue - directCosts;
  
  // Overhead Allocation (15% by default)
  const overheadAllocation = revenue * (pricing.overhead_percentage / 100);
  const netMargin = grossMargin - overheadAllocation;

  // Fleet Capacity & Utilization calculations
  const activeDrivers = new Set(routesRes.rows.map((r: any) => r.driver_id)).size;
  const standardSpeed = 1.5; // baseline properties cleared per hour per driver
  const targetShiftHours = 8.0;
  const fleetCapacityStops = activeDrivers * standardSpeed * targetShiftHours;
  const fleetUtilizationPercent = fleetCapacityStops > 0
    ? parseFloat(((completedStopsCount / fleetCapacityStops) * 100).toFixed(1))
    : 0.0;

  return {
    storm_id: s.storm_id,
    name: s.name,
    start_time: s.start_time ? new Date(s.start_time).toISOString() : null,
    end_time: s.end_time ? new Date(s.end_time).toISOString() : null,
    forecasted_accumulation: Number(s.forecasted_accumulation || 0.0),
    actual_accumulation: Number(s.actual_accumulation || 0.0),
    status: s.status,
    completed_stops: completedStopsCount,
    total_distance_mi: parseFloat(totalDistance.toFixed(2)),
    total_labor_hours: parseFloat((totalLaborSeconds / 3600.0).toFixed(2)),
    revenue: parseFloat(revenue.toFixed(2)),
    labor_cost: parseFloat(totalLaborCost.toFixed(2)),
    fuel_cost: parseFloat(fuelCost.toFixed(2)),
    direct_costs: parseFloat(directCosts.toFixed(2)),
    gross_margin: parseFloat(grossMargin.toFixed(2)),
    overhead_allocation: parseFloat(overheadAllocation.toFixed(2)),
    net_margin: parseFloat(netMargin.toFixed(2)),
    fleet_utilization_percent: fleetUtilizationPercent,
  };
}

// ❄️ 2. Seasonal Aggregations for Charts
export async function getSeasonalAnalytics(): Promise<StormFinancials[]> {
  // Fetch all completed or active storms
  const stormsRes = await query<any>(
    `SELECT storm_id FROM storm_events WHERE deleted_at IS NULL ORDER BY start_time ASC`
  );

  const seasonalMetrics: StormFinancials[] = [];
  for (const row of stormsRes.rows) {
    try {
      const stormData = await getStormFinancials(row.storm_id);
      seasonalMetrics.push(stormData);
    } catch (err) {
      logger.error(`Error aggregating storm ${row.storm_id} for seasonal stats:`, err);
    }
  }
  return seasonalMetrics;
}

// 🚜 3. Driver Sla/Efficiency Index Rankings
export async function getDriverRankings(): Promise<DriverPerformance[]> {
  const driversRes = await query<any>(
    `SELECT d.driver_id, d.name, d.hourly_rate, d.vehicle_type
       FROM drivers d
      WHERE d.deleted_at IS NULL AND d.status = 'active'`
  );

  const rankings: DriverPerformance[] = [];

  for (const d of driversRes.rows) {
    // Get completed stops count
    const stopsRes = await query<any>(
      `SELECT COUNT(rs.stop_id) as count
         FROM route_stops rs
         JOIN routes r ON rs.route_id = r.route_id
        WHERE r.driver_id = $1 AND rs.status = 'completed'`,
      [d.driver_id]
    );
    const completedStops = Number(stopsRes.rows[0]?.count || 0);

    // Sum active shift duration
    const shiftRes = await query<any>(
      `SELECT SUM(cumulative_active_seconds) as total_seconds
         FROM driver_shifts
        WHERE driver_id = $1 AND deleted_at IS NULL`,
      [d.driver_id]
    );
    let seconds = Number(shiftRes.rows[0]?.total_seconds || 0);

    // If zero shift history, compile sum of route execution durations
    if (seconds === 0) {
      const routeRes = await query<any>(
        `SELECT start_time, end_time FROM routes WHERE driver_id = $1 AND deleted_at IS NULL`,
        [d.driver_id]
      );
      for (const r of routeRes.rows) {
        if (r.start_time) {
          const end = r.end_time ? new Date(r.end_time) : new Date();
          seconds += Math.floor((end.getTime() - new Date(r.start_time).getTime()) / 1000);
        }
      }
    }

    const hours = Math.max(0.1, seconds / 3600.0);
    const speed = completedStops / hours;
    const hourlyRate = Number(d.hourly_rate ?? 25.0);
    const totalPayout = hours * hourlyRate;

    rankings.push({
      driver_id: d.driver_id,
      name: d.name,
      completed_stops: completedStops,
      labor_hours: parseFloat(hours.toFixed(2)),
      properties_per_hour: parseFloat(speed.toFixed(2)),
      hourly_rate: hourlyRate,
      total_payout: parseFloat(totalPayout.toFixed(2)),
      vehicle_type: d.vehicle_type || 'Truck',
    });
  }

  // Sort by efficiency (properties cleared per hour) descending
  return rankings.sort((a, b) => b.properties_per_hour - a.properties_per_hour);
}

// 🔮 4. Seasonal Projections (Forecast API)
export async function getSeasonalForecast() {
  const seasonalMetrics = await getSeasonalAnalytics();
  
  // Calculate historical baseline storm performance
  let totalRevenue = 0;
  let totalStorms = seasonalMetrics.length;
  
  for (const storm of seasonalMetrics) {
    totalRevenue += storm.revenue;
  }
  
  const averageRevenuePerStorm = totalStorms > 0 ? (totalRevenue / totalStorms) : 1200.00;
  
  // Predictor extrapolates across three winter severity tiers:
  // - Mild: 12 storms/season
  // - Average: 18 storms/season
  // - Severe (Buffalo Standard): 24 storms/season
  return {
    historical_baseline_storms: totalStorms,
    average_revenue_per_storm: parseFloat(averageRevenuePerStorm.toFixed(2)),
    projections: {
      mild_winter: {
        estimated_storms: 12,
        projected_revenue: parseFloat((averageRevenuePerStorm * 12).toFixed(2)),
      },
      average_winter: {
        estimated_storms: 18,
        projected_revenue: parseFloat((averageRevenuePerStorm * 18).toFixed(2)),
      },
      severe_winter: {
        estimated_storms: 24,
        projected_revenue: parseFloat((averageRevenuePerStorm * 24).toFixed(2)),
      },
    },
  };
}

// 🔮 5. Capacity Planner & Crew-Size Recommender
export async function getCrewSizeRecommendation() {
  const rankings = await getDriverRankings();

  // Fetch total active properties
  const custRes = await query<any>('SELECT COUNT(customer_id) as count FROM customers WHERE status = \'active\' AND deleted_at IS NULL');
  const activePropertiesCount = Number(custRes.rows[0]?.count || 10);

  // Compute average crew speed (properties cleared per hour)
  const averageHourlySpeed = rankings.length > 0 
    ? (rankings.reduce((sum, d) => sum + d.properties_per_hour, 0) / rankings.length) 
    : 1.5; // fallback baseline properties per hour per truck

  // Calculate recommended crew to complete all operations within 8-hour window
  // Minimum crew size = activePropertiesCount / (averageHourlySpeed * 8h window)
  const recommendedCrewSize = Math.ceil(activePropertiesCount / (averageHourlySpeed * 8.0));

  return {
    total_active_properties: activePropertiesCount,
    average_driver_clearing_speed_mph: parseFloat(averageHourlySpeed.toFixed(2)),
    target_completion_window_hours: 8,
    recommended_crew_size: Math.max(1, recommendedCrewSize),
    scenarios: [
      { storm_size_inches: 4, multiplier: 1.0, recommended_crew: Math.max(1, recommendedCrewSize) },
      { storm_size_inches: 8, multiplier: 1.4, recommended_crew: Math.max(1, Math.ceil(recommendedCrewSize * 1.4)) },
      { storm_size_inches: 12, multiplier: 1.8, recommended_crew: Math.max(1, Math.ceil(recommendedCrewSize * 1.8)) },
    ],
  };
}

// 🔮 6. Pricing-Optimization Signals (Bottom Decile Margin Cohort Alerts)
export async function getPricingOptimizations(): Promise<PricingCohortAlert[]> {
  const pricing = await getPricingSettings();

  // Fetch all completed stops with distances, property types, and driver hourly rates to calculate margins
  const stopsRes = await query<any>(
    `SELECT rs.stop_id, rs.route_id, rs.customer_id, c.name as customer_name, c.address, c.property_type,
            r.total_distance, d.hourly_rate, r.start_time, r.end_time
       FROM route_stops rs
       JOIN customers c ON rs.customer_id = c.customer_id
       JOIN routes r ON rs.route_id = r.route_id
       JOIN drivers d ON r.driver_id = d.driver_id
      WHERE rs.status = 'completed' AND rs.deleted_at IS NULL AND r.deleted_at IS NULL`
  );

  if (stopsRes.rows.length === 0) {
    return [];
  }

  const stopFinancials: Array<{
    customer_id: string;
    customer_name: string;
    property_type: string;
    address: string;
    revenue: number;
    allocated_cost: number;
    profit_margin: number;
  }> = [];

  // Group stops by route to correctly allocate labor and fuel overhead evenly per stop
  const routeStopsMap = new Map<string, number>();
  for (const s of stopsRes.rows) {
    const routeId = String(s.route_id);
    routeStopsMap.set(routeId, (routeStopsMap.get(routeId) || 0) + 1);
  }

  for (const s of stopsRes.rows) {
    const stopsOnRoute = routeStopsMap.get(String(s.route_id)) || 1;
    
    // Stop Revenue
    const stopRevenue = s.property_type === 'commercial' ? pricing.commercial_rate : pricing.residential_rate;

    // Fuel cost allocation for this stop: (total route distance / MPG * fuel price) / stops on route
    const totalRouteDistance = Number(s.total_distance ?? 0);
    const routeFuelCost = (totalRouteDistance / pricing.vehicle_mpg) * pricing.fuel_price_per_gallon;
    const allocatedFuelCost = routeFuelCost / stopsOnRoute;

    // Labor cost allocation: (route duration * hourly rate) / stops on route
    let activeSeconds = 0;
    if (s.start_time) {
      const end = s.end_time ? new Date(s.end_time) : new Date();
      activeSeconds = Math.max(0, Math.floor((end.getTime() - new Date(s.start_time).getTime()) / 1000));
    }
    const routeLaborCost = (activeSeconds / 3600.0) * Number(s.hourly_rate ?? 25.0);
    const allocatedLaborCost = routeLaborCost / stopsOnRoute;

    const allocatedCost = allocatedFuelCost + allocatedLaborCost;
    const profitMargin = stopRevenue - allocatedCost;

    stopFinancials.push({
      customer_id: String(s.customer_id),
      customer_name: String(s.customer_name),
      property_type: String(s.property_type),
      address: String(s.address),
      revenue: stopRevenue,
      allocated_cost: allocatedCost,
      profit_margin: profitMargin,
    });
  }

  // Sort by profit margin percentage ascending
  const compiled = stopFinancials.map((s) => {
    const marginPercent = s.revenue > 0 ? (s.profit_margin / s.revenue) * 100 : -100;
    return {
      customer_id: s.customer_id,
      customer_name: s.customer_name,
      property_type: s.property_type,
      address: s.address,
      revenue_per_stop: parseFloat(s.revenue.toFixed(2)),
      allocated_cost_per_stop: parseFloat(s.allocated_cost.toFixed(2)),
      profit_margin_percent: parseFloat(marginPercent.toFixed(1)),
      recommendation: s.property_type === 'commercial' 
        ? 'Suggest upgrading contract pricing by 25% due to extensive clearing time and travel distance.' 
        : 'Suggest increasing residential stop rate by $15.00 to offset fuel & route labor constraints.',
    };
  });

  compiled.sort((a, b) => a.profit_margin_percent - b.profit_margin_percent);

  // Return bottom 10% (decile) of records
  const decileThresholdIndex = Math.max(1, Math.ceil(compiled.length * 0.10));
  return compiled.slice(0, decileThresholdIndex);
}
