import type { Request, Response } from 'express';
import { getSettings, updateSettings, getDriverSettings, updateDriverSettings, getOtherOrganizations } from '../settings.controller';
import { query } from '../../config/db';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

describe('Settings Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('getSettings', () => {
    it('should retrieve organization settings successfully', async () => {
      const mockResult = {
        settings_id: 'settings-123',
        company_name: 'PlowPath Staging',
        support_phone: '+15551234567',
        support_email: 'support@plowpath.app',
        settings: { storm_accumulation_threshold_inches: 2.0 },
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockResult] });

      await getSettings(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM organization_settings'));
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('should throw error if settings are not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await expect(getSettings(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('getOtherOrganizations', () => {
    it('should return a list of other organizations successfully', async () => {
      const mockResult = [
        { settings_id: 'org-2', company_name: 'SnowBusters' },
      ];

      (mockReq as any).user = { sub: 'user-123', role: 'owner', orgId: 'org-1' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockResult });

      await getOtherOrganizations(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('organization_settings'),
        ['org-1']
      );
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('should throw error if user has no orgId', async () => {
      (mockReq as any).user = { sub: 'user-123', role: 'owner' }; // No orgId
      await expect(getOtherOrganizations(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('updateSettings', () => {
    it('should update organization settings and return updated row', async () => {
      const inputData = {
        company_name: 'PlowPath New Name',
        support_phone: '+15557654321',
        support_email: 'new-support@plowpath.app',
        settings: {
          storm_accumulation_threshold_inches: 3.5,
          message_templates: {
            sms_pre_storm: 'Storm is coming {{customer}}!',
            sms_en_route: 'Plow is en route to {{address}}!',
            sms_completed: 'Done at {{address}}!',
          },
          quiet_hours: {
            enabled: true,
            start: '21:00',
            end: '07:00',
          },
          geocoding_bounds: {
            min_lat: 42.0,
            min_lon: -79.0,
            max_lat: 44.0,
            max_lon: -77.0,
          },
        },
      };

      mockReq.body = inputData;
      (query as jest.Mock).mockResolvedValueOnce({ rows: [inputData] });

      await updateSettings(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organization_settings'),
        [
          'PlowPath New Name',
          '+15557654321',
          'new-support@plowpath.app',
          JSON.stringify(inputData.settings),
        ]
      );
      expect(mockJson).toHaveBeenCalledWith(inputData);
    });

    it('should throw error on invalid data validation', async () => {
      mockReq.body = {
        company_name: '', // Empty
        support_email: 'bad-email-format',
      };

      await expect(updateSettings(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('getDriverSettings', () => {
    it('should get driver specific settings successfully', async () => {
      const mockDriverSettings = {
        theme: 'dark',
        navigation_app: 'waze',
        tracking_accuracy: 'high',
        upload_frequency_seconds: 45,
      };

      (mockReq as any).user = { sub: 'user-123', role: 'driver', driverId: 'driver-uuid-123' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ settings_json: mockDriverSettings }] });

      await getDriverSettings(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM drivers'),
        ['driver-uuid-123']
      );
      expect(mockJson).toHaveBeenCalledWith(mockDriverSettings);
    });

    it('should fail if user is not a driver', async () => {
      (mockReq as any).user = { sub: 'user-123', role: 'owner' }; // Not a driver
      await expect(getDriverSettings(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });

  describe('updateDriverSettings', () => {
    it('should update driver specific settings and return active JSON', async () => {
      const inputDriverSettings = {
        theme: 'dark',
        navigation_app: 'waze',
        tracking_accuracy: 'power_saver',
        upload_frequency_seconds: 60,
      };

      (mockReq as any).user = { sub: 'user-123', role: 'driver', driverId: 'driver-uuid-123' };
      mockReq.body = inputDriverSettings;
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ settings_json: inputDriverSettings }] });

      await updateDriverSettings(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE drivers'),
        [JSON.stringify(inputDriverSettings), 'driver-uuid-123']
      );
      expect(mockJson).toHaveBeenCalledWith(inputDriverSettings);
    });

    it('should fail validation on invalid values', async () => {
      (mockReq as any).user = { sub: 'user-123', role: 'driver', driverId: 'driver-uuid-123' };
      mockReq.body = {
        theme: 'ultra-dark', // invalid enum
        navigation_app: 'google_maps',
        tracking_accuracy: 'high',
        upload_frequency_seconds: -10, // negative integer
      };

      await expect(updateDriverSettings(mockReq as Request, mockRes as Response)).rejects.toThrow();
    });
  });
});
