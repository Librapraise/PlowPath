import type { Request, Response } from 'express';
import { 
  getSeasonalAnalytics, getStormAnalytics, getDriverAnalytics, 
  getDriverRankings, getSeasonalForecast, getCrewSizeRecommendation,
  getPricingOptimizations, exportFinancialsCsv 
} from '../analytics.controller';
import { query } from '../../config/db';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

describe('Analytics Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSetHeader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockSend = jest.fn();
    mockSetHeader = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ 
      json: mockJson,
      send: mockSend
    }));
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
      send: mockSend,
    };

    // Global deterministic conditional query mocker
    (query as jest.Mock).mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('organization_settings')) {
        return Promise.resolve({
          rows: [{
            settings: {
              pricing: {
                residential_rate: 50.0,
                commercial_rate: 150.0,
                fuel_price_per_gallon: 3.75,
                vehicle_mpg: 10.0,
                overhead_percentage: 15.0,
              }
            }
          }]
        });
      }
      if (sql.includes('FROM storm_events')) {
        if (sql.includes('WHERE storm_id =')) {
          return Promise.resolve({
            rows: [{
              storm_id: params ? params[0] : 'storm-uuid-1',
              name: 'Buffalo Heavy Storm',
              start_time: new Date('2026-02-15T00:00:00Z'),
              end_time: new Date('2026-02-15T10:00:00Z'),
              forecasted_accumulation: 8.0,
              actual_accumulation: 9.0,
              status: 'completed',
            }]
          });
        } else {
          return Promise.resolve({
            rows: [{ storm_id: 'storm-uuid-1' }]
          });
        }
      }
      if (sql.includes('FROM routes')) {
        return Promise.resolve({
          rows: [{
            route_id: 'route-uuid-1',
            driver_id: 'driver-uuid-1',
            total_distance: 10.0,
            start_time: new Date('2026-02-15T00:00:00Z'),
            end_time: new Date('2026-02-15T02:00:00Z'),
            hourly_rate: 25.0,
          }]
        });
      }
      if (sql.includes('FROM route_stops')) {
        if (sql.includes('COUNT(rs.stop_id)')) {
          return Promise.resolve({ rows: [{ count: 12 }] });
        }
        return Promise.resolve({
          rows: [
            { stop_id: 'stop-1', route_id: 'route-uuid-1', customer_id: 'customer-1', customer_name: 'Acme LLC', address: '123 Main St', property_type: 'residential', total_distance: 10.0, hourly_rate: 25.0, start_time: new Date('2026-02-15T00:00:00Z'), end_time: new Date('2026-02-15T02:00:00Z'), status: 'completed' }
          ]
        });
      }
      if (sql.includes('FROM driver_shifts')) {
        if (sql.includes('SUM(cumulative_active_seconds)')) {
          return Promise.resolve({ rows: [{ total_seconds: 14400 }] }); // 4 hours
        }
        return Promise.resolve({
          rows: [{ cumulative_active_seconds: 7200 }] // 2 hours
        });
      }
      if (sql.includes('FROM drivers')) {
        return Promise.resolve({
          rows: [{
            driver_id: 'driver-uuid-1',
            name: 'Mike Plowman',
            hourly_rate: 25.00,
            vehicle_type: 'Plow Truck',
          }]
        });
      }
      if (sql.includes('customers')) {
        return Promise.resolve({
          rows: [{ count: 48 }]
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe('getSeasonalAnalytics', () => {
    it('should aggregate and list seasonal storm financial summaries', async () => {
      await getSeasonalAnalytics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          storm_id: 'storm-uuid-1',
          completed_stops: 1,
          revenue: 50, // 1 residential stop = $50
          labor_cost: 50, // 2 hours * $25
          fuel_cost: 3.75, // 10 miles / 10 MPG * 3.75
          direct_costs: 53.75,
          gross_margin: -3.75,
          overhead_allocation: 7.50, // 50 * 15%
          net_margin: -11.25,
          fleet_utilization_percent: 8.3,
        })
      ]));
    });
  });

  describe('getStormAnalytics', () => {
    it('should calculate detailed margins for a targeted storm', async () => {
      mockReq.params = { stormId: 'storm-uuid-1' };
      await getStormAnalytics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        storm_id: 'storm-uuid-1',
        revenue: 50,
        labor_cost: 50,
        fuel_cost: 3.75,
        direct_costs: 53.75,
        gross_margin: -3.75,
        overhead_allocation: 7.5,
        net_margin: -11.25,
        fleet_utilization_percent: 8.3,
      }));
    });
  });

  describe('getDriverAnalytics', () => {
    it('should rank active drivers based on completed properties per hour', async () => {
      mockReq.params = { driverId: 'driver-uuid-1' };
      await getDriverAnalytics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        driver_id: 'driver-uuid-1',
        name: 'Mike Plowman',
        completed_stops: 12,
        labor_hours: 4,
        properties_per_hour: 3, // 12 stops / 4 hours
        total_payout: 100, // 4 hours * 25
      }));
    });
  });

  describe('getCrewSizeRecommendation', () => {
    it('should compute recommended crew sizes within 8h clearing window', async () => {
      await getCrewSizeRecommendation(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        total_active_properties: 48,
        average_driver_clearing_speed_mph: 3.0,
        recommended_crew_size: 2, // 48 stops / (3.0 stops/h * 8h window) = 2 crew
      }));
    });
  });

  describe('getPricingOptimizations', () => {
    it('should calculate profit margins and return pricing recommendations for the bottom decile', async () => {
      await getPricingOptimizations(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          customer_id: 'customer-1',
          customer_name: 'Acme LLC',
          property_type: 'residential',
          address: '123 Main St',
          revenue_per_stop: 50,
          allocated_cost_per_stop: 53.75,
          profit_margin_percent: -7.5,
          recommendation: 'Suggest increasing residential stop rate by $15.00 to offset fuel & route labor constraints.',
        })
      ]));
    });
  });

  describe('exportFinancialsCsv', () => {
    it('should stream formatted CSV string with correct attachments headers', async () => {
      await exportFinancialsCsv(mockReq as Request, mockRes as Response);

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=plowpath_financials_export.csv');
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('"Buffalo Heavy Storm"'));
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining(',50,')); // Revenue
    });
  });
});
