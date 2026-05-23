import type { Request, Response } from 'express';
import { handleVoiceCall, handleInboundSms, handleSmsStatus } from '../twilio.controller';
import { query } from '../../config/db';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

describe('Twilio Webhook Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSet: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    mockSet = jest.fn();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ send: mockSend, json: mockJson }));
    
    mockReq = {
      body: {},
    };
    
    mockRes = {
      status: mockStatus,
      set: mockSet,
      send: mockSend,
      json: mockJson,
    };
  });

  describe('handleVoiceCall', () => {
    it('should generate TwiML voice menu if no digits are provided', async () => {
      mockReq.body = { From: '+15551234567' };

      await handleVoiceCall(mockReq as Request, mockRes as Response);

      expect(mockSet).toHaveBeenCalledWith('Content-Type', 'text/xml');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('<Gather numDigits="1"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('Please press 1 to confirm your service request, or press 2 to skip this storm.')
      );
    });

    it('should update next_service_decision to confirm and return thank you if Digits=1', async () => {
      mockReq.body = { From: '+15551234567', Digits: '1' };

      // Mock database matching customer
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ customer_id: 'customer-uuid-1', name: 'John Doe' }],
        rowCount: 1,
      });

      await handleVoiceCall(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT customer_id, name FROM customers'),
        expect.any(Array)
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET next_service_decision = $1'),
        ['confirm', 'customer-uuid-1']
      );

      expect(mockSet).toHaveBeenCalledWith('Content-Type', 'text/xml');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('Your snow removal service is confirmed.')
      );
    });

    it('should update next_service_decision to skip and return goodbye if Digits=2', async () => {
      mockReq.body = { From: '+15551234567', Digits: '2' };

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ customer_id: 'customer-uuid-2', name: 'Commercial Corp' }],
        rowCount: 1,
      });

      await handleVoiceCall(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET next_service_decision = $1'),
        ['skip', 'customer-uuid-2']
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('You have opted to skip this storm.')
      );
    });
  });

  describe('handleInboundSms', () => {
    it('should unsubscribe customer if message is STOP', async () => {
      mockReq.body = { From: '+15551234567', Body: 'STOP' };

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ customer_id: 'customer-uuid-3', name: 'Alice Smith' }],
        rowCount: 1,
      });

      await handleInboundSms(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET notify_sms = FALSE'),
        ['customer-uuid-3']
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('You have been successfully unsubscribed')
      );
    });

    it('should resubscribe customer if message is START', async () => {
      mockReq.body = { From: '+15551234567', Body: 'START' };

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ customer_id: 'customer-uuid-3', name: 'Alice Smith' }],
        rowCount: 1,
      });

      await handleInboundSms(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET notify_sms = TRUE'),
        ['customer-uuid-3']
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('Welcome back to PlowPath alerts!')
      );
    });
  });

  describe('handleSmsStatus', () => {
    it('should log status and return 200 JSON success', async () => {
      mockReq.body = {
        MessageSid: 'SM12345',
        MessageStatus: 'delivered',
        To: '+15551234567',
      };

      await handleSmsStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });
  });
});
