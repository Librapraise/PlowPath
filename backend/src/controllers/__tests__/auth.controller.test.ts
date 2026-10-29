import type { Request, Response } from 'express';
import { login, refresh, logout, forgotPassword, resetPassword } from '../auth.controller';
import { query } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { sendEmail } from '../../services/email.service';
import { sendSms } from '../../services/twilio.service';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../services/email.service', () => ({
  sendEmail: jest.fn(),
}));
jest.mock('../../services/twilio.service', () => ({
  sendSms: jest.fn(),
}));

describe('Auth Controller', () => {
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
    mockReq = { body: {} };
    mockRes = {
      status: mockStatus,
      json: mockJson,
      end: mockEnd,
    };
  });

  describe('login', () => {
    it('should throw validation error if identifier is missing', async () => {
      mockReq.body = { password: 'pass' };
      await expect(login(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });

    it('should authenticate successfully with correct email', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockReq.body = { identifier: 'owner@plowpath.com', password: 'password123' };

      // Mock user lookup
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'owner@plowpath.com',
          phone: null,
          password_hash: passwordHash,
          role: 'owner',
          name: 'Owner User',
        }],
      });

      await login(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('email = $1'),
        ['owner@plowpath.com']
      );
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          refresh_token: expect.any(String),
          user: expect.objectContaining({
            user_id: 'user-123',
            role: 'owner',
          }),
        })
      );
    });

    it('should authenticate driver and lookup driver_id', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockReq.body = { identifier: '555-0199', password: 'password123' };

      // 1. Mock user query
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'driver-u-1',
          email: null,
          phone: '555-0199',
          password_hash: passwordHash,
          role: 'driver',
          name: 'Driver Joe',
        }],
      });

      // 2. Mock driver query
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ driver_id: 'driver-uuid-99' }],
      });

      await login(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('phone = $1'),
        ['555-0199']
      );
      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('FROM drivers'),
        ['driver-u-1']
      );
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            driver_id: 'driver-uuid-99',
            role: 'driver',
          }),
        })
      );
    });

    it('should throw unauthorized error for incorrect credentials', async () => {
      mockReq.body = { identifier: 'owner@plowpath.com', password: 'wrongpassword' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(login(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('should sign new tokens if refresh token is valid', async () => {
      const payload = { sub: 'user-123', role: 'owner', typ: 'refresh' };
      const refreshToken = jwt.sign(payload, env.JWT_SECRET);
      mockReq.body = { refresh_token: refreshToken };

      await refresh(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          refresh_token: expect.any(String),
        })
      );
    });

    it('should fail if token type is wrong', async () => {
      const payload = { sub: 'user-123', role: 'owner', typ: 'access' };
      const badToken = jwt.sign(payload, env.JWT_SECRET);
      mockReq.body = { refresh_token: badToken };

      await expect(refresh(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should return 204 status', async () => {
      await logout(mockReq as Request, mockRes as Response);
      expect(mockStatus).toHaveBeenCalledWith(204);
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send an email reset code when identifier is an email', async () => {
      mockReq.body = { identifier: 'owner@plowpath.com' };
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'owner@plowpath.com',
          phone: null,
          name: 'Owner User',
        }],
      });
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // For the update query

      await forgotPassword(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('email = $1'), ['owner@plowpath.com']);
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE users'), expect.any(Array));
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'owner@plowpath.com',
        subject: 'PlowPath Password Reset Code',
      }));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'If the account exists, a reset code has been sent.' });
    });

    it('should send an SMS reset code when identifier is a phone number', async () => {
      mockReq.body = { identifier: '5550199' };
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: null,
          phone: '5550199',
          name: 'Owner User',
        }],
      });
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // For the update query

      await forgotPassword(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('phone = $1'), ['5550199']);
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE users'), expect.any(Array));
      expect(sendSms).toHaveBeenCalledWith(expect.objectContaining({
        to: '5550199',
        body: expect.stringContaining('Your PlowPath password reset code is'),
      }));
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 200 message and do nothing if user is not found', async () => {
      mockReq.body = { identifier: 'unknown@plowpath.com' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await forgotPassword(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('email = $1'), ['unknown@plowpath.com']);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendSms).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should throw and log error when database fails', async () => {
      mockReq.body = { identifier: 'owner@plowpath.com' };
      (query as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));

      await expect(forgotPassword(mockReq as Request, mockRes as Response)).rejects.toThrow('DB failure');
    });
  });

  describe('resetPassword', () => {
    it('should update password hash successfully if code matches and is not expired', async () => {
      mockReq.body = {
        identifier: 'owner@plowpath.com',
        token: '123456',
        newPassword: 'newsecurepassword',
      };
      
      const expiry = new Date(Date.now() + 5000).toISOString();
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'owner@plowpath.com',
          phone: null,
          reset_token: '123456',
          reset_token_expires_at: expiry,
        }],
      });
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // For the update query

      await resetPassword(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('email = $1'), ['owner@plowpath.com']);
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE users'), expect.any(Array));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Password has been successfully updated.' });
    });

    it('should throw badRequest if user is not found', async () => {
      mockReq.body = {
        identifier: 'owner@plowpath.com',
        token: '123456',
        newPassword: 'newsecurepassword',
      };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(resetPassword(mockReq as Request, mockRes as Response)).rejects.toThrow('Invalid verification code or identifier');
    });

    it('should throw badRequest if token is invalid', async () => {
      mockReq.body = {
        identifier: 'owner@plowpath.com',
        token: '123456',
        newPassword: 'newsecurepassword',
      };
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'owner@plowpath.com',
          phone: null,
          reset_token: 'wrong_token',
          reset_token_expires_at: new Date(Date.now() + 5000).toISOString(),
        }],
      });

      await expect(resetPassword(mockReq as Request, mockRes as Response)).rejects.toThrow('Invalid verification code or identifier');
    });

    it('should throw badRequest if token has expired', async () => {
      mockReq.body = {
        identifier: 'owner@plowpath.com',
        token: '123456',
        newPassword: 'newsecurepassword',
      };
      const pastExpiry = new Date(Date.now() - 5000).toISOString();
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'owner@plowpath.com',
          phone: null,
          reset_token: '123456',
          reset_token_expires_at: pastExpiry,
        }],
      });

      await expect(resetPassword(mockReq as Request, mockRes as Response)).rejects.toThrow('Verification code has expired');
    });
  });
});
