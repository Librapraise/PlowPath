import type { Request, Response } from 'express';
import { updateFcmToken } from '../drivers.controller';
import { query } from '../../config/db';
import { HttpError } from '../../utils/httpError';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

describe('Drivers Controller - updateFcmToken', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockEnd: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockEnd = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson, end: mockEnd }));
    mockReq = {
      body: {},
      user: {
        sub: 'user-uuid-123',
        role: 'driver',
        driverId: 'driver-uuid-456',
      },
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
      end: mockEnd,
    };
  });

  it('should throw unauthorized error if req.user is missing', async () => {
    delete mockReq.user;
    mockReq.body = { fcm_token: 'valid-fcm-token' };

    await expect(updateFcmToken(mockReq as Request, mockRes as Response)).rejects.toThrow(
      expect.objectContaining({ status: 401 })
    );
  });

  it('should throw validation error if fcm_token is missing', async () => {
    mockReq.body = {};

    await expect(updateFcmToken(mockReq as Request, mockRes as Response)).rejects.toThrow();
  });

  it('should throw validation error if fcm_token is empty string', async () => {
    mockReq.body = { fcm_token: '' };

    await expect(updateFcmToken(mockReq as Request, mockRes as Response)).rejects.toThrow();
  });

  it('should update fcm_token successfully and return driver data', async () => {
    mockReq.body = { fcm_token: 'new-device-token-abc' };

    const expectedDriver = {
      driver_id: 'driver-uuid-456',
      user_id: 'user-uuid-123',
      name: 'Mike Plowman',
      phone: '+15551110001',
      fcm_token: 'new-device-token-abc',
      updated_at: '2026-05-22T20:00:00Z',
    };

    (query as jest.Mock).mockResolvedValueOnce({
      rows: [expectedDriver],
      rowCount: 1,
    });

    await updateFcmToken(mockReq as Request, mockRes as Response);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE drivers SET fcm_token = $1'),
      ['new-device-token-abc', 'user-uuid-123']
    );
    expect(mockJson).toHaveBeenCalledWith(expectedDriver);
  });

  it('should throw a not found error if the driver profile does not exist', async () => {
    mockReq.body = { fcm_token: 'new-device-token-abc' };

    (query as jest.Mock).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    });

    await expect(updateFcmToken(mockReq as Request, mockRes as Response)).rejects.toThrow(
      expect.objectContaining({ status: 404, message: 'Driver profile not found for this authenticated user' })
    );
  });
});
