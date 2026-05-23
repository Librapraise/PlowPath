import type { Request, Response } from 'express';
import { updateStop, broadcastSms } from '../routes.controller';
import { query } from '../../config/db';
import { enqueueSmsNotification } from '../../services/notification.service';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

jest.mock('../../services/notification.service', () => ({
  enqueuePushNotification: jest.fn().mockResolvedValue(undefined),
  enqueueSmsNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/optimization.service', () => ({
  optimizeRoute: jest.fn(),
  totalRouteDistance: jest.fn(),
}));

jest.mock('../../services/routing.service', () => ({
  getDirections: jest.fn(),
}));

describe('Routes Controller - SMS Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    
    mockReq = {
      params: {},
      body: {},
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('updateStop status completions', () => {
    it('should update stop to completed and trigger SMS notifications', async () => {
      mockReq.params = { stopId: 'stop-uuid-1' };
      mockReq.body = { status: 'completed' };

      const updatedStop = {
        stop_id: 'stop-uuid-1',
        route_id: 'route-uuid-999',
        customer_id: 'customer-uuid-111',
        sequence_number: 2,
        status: 'completed',
      };

      // 1. Mock DB returning the updated stop record
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [updatedStop],
        rowCount: 1,
      });

      // 2. Mock DB returning next stop in sequence
      const nextStop = { customer_id: 'customer-uuid-222' };
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [nextStop],
        rowCount: 1,
      });

      await updateStop(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE route_stops SET'),
        expect.any(Array)
      );

      // Verify completion notification enqueued
      expect(enqueueSmsNotification).toHaveBeenCalledWith(
        'customer-uuid-111',
        'completed',
        expect.stringContaining('cleared successfully')
      );

      // Verify next customer in sequence is queried
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT customer_id FROM route_stops'),
        ['route-uuid-999', 3] // sequence_number + 1
      );

      // Verify en-route notification enqueued for next customer
      expect(enqueueSmsNotification).toHaveBeenLastCalledWith(
        'customer-uuid-222',
        'en_route',
        expect.stringContaining('is en-route to your property')
      );

      expect(mockJson).toHaveBeenCalledWith(updatedStop);
    });
  });

  describe('broadcastSms bulk dispatch', () => {
    it('should dispatch broadcast SMS to all route customers', async () => {
      mockReq.params = { id: 'route-uuid-888' };
      mockReq.body = { message: 'Crews are arriving!' };

      // Mock database returning 3 stops
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { customer_id: 'cust-1' },
          { customer_id: 'cust-2' },
          { customer_id: 'cust-3' },
        ],
        rowCount: 3,
      });

      await broadcastSms(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT customer_id FROM route_stops WHERE route_id = $1'),
        ['route-uuid-888']
      );

      // Asserts 3 SMS notifications enqueued with bypassLimit=true
      expect(enqueueSmsNotification).toHaveBeenCalledTimes(3);
      expect(enqueueSmsNotification).toHaveBeenNthCalledWith(
        1,
        'cust-1',
        'broadcast',
        'Crews are arriving!',
        true
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ success: true, enqueued_count: 3 });
    });
  });
});
