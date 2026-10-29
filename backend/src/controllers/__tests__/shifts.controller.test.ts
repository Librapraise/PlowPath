import type { Request, Response } from 'express';
import { startShift, endShift, logHeartbeat, handleShiftHandover } from '../shifts.controller';
import { query, pool } from '../../config/db';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn().mockReturnValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

describe('Shifts Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    mockReq = {
      body: {},
      user: {
        sub: 'user-driver-1',
        role: 'driver',
        driverId: 'driver-123',
        orgId: 'org-abc',
      },
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('startShift', () => {
    it('should initialize a shift successfully if not already active', async () => {
      // 1. Mock query showing no active shift
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // 2. Mock query inserting the shift
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'shift-new',
          driver_id: 'driver-123',
          org_id: 'org-abc',
          status: 'active',
        }],
      });

      await startShift(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ id: 'shift-new' }));
    });

    it('should return existing shift details if driver already has an active shift', async () => {
      // Mock query showing one active shift
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'shift-active', status: 'active' }],
      });

      await startShift(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ id: 'shift-active' }));
    });
  });

  describe('endShift', () => {
    it('should end shift and compute active duration', async () => {
      // 1. Mock active shift lookup
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'shift-active', started_at: new Date(Date.now() - 3600 * 1000) }], // 1 hr ago
      });

      // 2. Mock update shift status
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'shift-active',
          status: 'ended',
          cumulative_active_seconds: 3600,
        }],
      });

      await endShift(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ended', cumulative_active_seconds: expect.any(Number) })
      );
    });

    it('should fail if no active shift exists', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(endShift(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('logHeartbeat', () => {
    it('should record heartbeat telemetry points successfully', async () => {
      mockReq.body = {
        is_moving: true,
        battery_level: 0.85,
        latitude: 41.8781,
        longitude: -87.6298,
      };

      // Mock active shift check
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'shift-active' }] });

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 'shift-active', last_heartbeat_at: new Date() }],
        }),
        release: jest.fn(),
      };
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await logHeartbeat(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO driver_shift_heartbeats'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('handleShiftHandover', () => {
    it('should transactionally complete shift handovers using token', async () => {
      const payload = { sub: 'driver_shift_handover', shiftId: 'shift-old', routeId: 'route-99' };
      const qrToken = jwt.sign(payload, env.JWT_SECRET);
      mockReq.body = { qrToken };

      // Mock active shift check
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'shift-old', status: 'active' }],
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // UPDATE shift-old
          .mockResolvedValueOnce({ rows: [{ id: 'shift-new' }] }) // INSERT new shift
          .mockResolvedValueOnce({ rows: [] }) // UPDATE route
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await handleShiftHandover(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE driver_shifts SET status = \'ended\''),
        ['shift-old']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO driver_shifts'),
        ['driver-123', 'org-abc']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Handover completed successfully.', newShiftId: 'shift-new' })
      );
    });
  });
});
