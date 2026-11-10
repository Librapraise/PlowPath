import type { Request, Response } from 'express';
import { importCsv, getGeocodingStatus, triggerGeocoding } from '../customers.controller';
import { query, pool } from '../../config/db';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../services/geocoding.service', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ lat: 45.3056, lon: -73.2534 }),
}));

describe('Customers Import Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('importCsv with CSV string', () => {
    it('successfully imports new records and concatenates city/province/postal', async () => {
      const csv = `Nom complet,Adresse,Ville,Province,Code postal,Téléphone,Courriel,Type de propriété,Solde dû,Statut panneau
"Test Client 055","215 Rue Benoit","Saint-Jean-sur-Richelieu","QC","J3B 2M1","514-555-0100","client55@test.com","residential","0","removed"`;

      mockReq.body = { csv };

      // Query mock: BEGIN, SELECT existing (returns empty), INSERT, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ customer_id: 'cust-1' }] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await importCsv(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT customer_id'),
        expect.arrayContaining(['Test Client 055', '215 Rue Benoit, Saint-Jean-sur-Richelieu QC J3B 2M1'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        imported_count: 1,
        updated_count: 0,
        errors_count: 0,
      }));
    });

    it('performs idempotent upsert when customer already exists', async () => {
      const csv = `Name,Address,Phone,Email,Property Type,Outstanding Balance,Sign Status
"Test Client 055","215 Rue Benoit","514-555-9999","updated@test.com","residential","150.00","installed"`;

      mockReq.body = { csv };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ customer_id: 'existing-uuid-1', lat: 45.3, lon: -73.2 }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await importCsv(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers'),
        expect.arrayContaining(['215 Rue Benoit', '514-555-9999', 'updated@test.com', 'residential', 150, 'existing-uuid-1'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        imported_count: 0,
        updated_count: 1,
        errors_count: 0,
      }));
    });
  });

  describe('importCsv with JSON customers array', () => {
    it('imports records submitted directly via JSON array from wizard', async () => {
      mockReq.body = {
        customers: [
          {
            name: 'Client Alpha',
            address: '100 Main St, Repentigny QC J5Z 1A1',
            phone: '514-555-1234',
            email: 'alpha@test.com',
            property_type: 'residential',
            outstanding_balance: 0,
            sign_status: 'removed',
          },
          {
            name: 'Client Beta',
            address: '200 Commercial Rd, Laval QC H7N 1A1',
            phone: null,
            email: null,
            property_type: 'commercial',
            outstanding_balance: 500,
            sign_status: 'installed',
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing for Alpha
        .mockResolvedValueOnce({ rows: [{ customer_id: 'cust-alpha' }] }) // INSERT Alpha
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing for Beta
        .mockResolvedValueOnce({ rows: [{ customer_id: 'cust-beta' }] }) // INSERT Beta
        .mockResolvedValueOnce({}); // COMMIT

      await importCsv(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        imported_count: 2,
        updated_count: 0,
        errors_count: 0,
      }));
    });
  });

  describe('geocoding endpoints', () => {
    it('returns geocoding status', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '14' }] });

      await getGeocodingStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        pending_count: 14,
        is_active: expect.any(Boolean),
      });
    });

    it('triggers background geocoding', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      await triggerGeocoding(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Background geocoding triggered',
      });
    });
  });
});
