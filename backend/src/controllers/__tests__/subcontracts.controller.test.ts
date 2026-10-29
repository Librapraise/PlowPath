import type { Request, Response } from 'express';
import { broadcastOffer, listActiveOffers, acceptOffer, submitProof } from '../subcontracts.controller';
import { query, pool } from '../../config/db';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn().mockReturnValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

describe('Subcontracts Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  const validOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const competitorOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
  const validDriverId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const validRouteId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const validOfferId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const validStopId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    mockReq = {
      body: {},
      params: {},
      user: {
        sub: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa',
        role: 'manager',
        orgId: validOrgId,
      },
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('broadcastOffer', () => {
    it('should broadcast an offer successfully', async () => {
      mockReq.body = {
        route_stop_ids: [validStopId],
        offered_payout: 45.0,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // SET current_org_id
          .mockResolvedValueOnce({ rows: [{ id: validOfferId }] }) // INSERT offer
          .mockResolvedValueOnce({ rows: [{ stop_id: validStopId }] }) // SELECT stop check
          .mockResolvedValueOnce({ rows: [] }) // INSERT stop link
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await broadcastOffer(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subcontract_offers'),
        [validOrgId, null, 45.0]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ id: validOfferId }));
    });
  });

  describe('listActiveOffers', () => {
    it('should list active broadcasted offers from other companies', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: validOfferId, offered_payout: 40.0, stop_count: 3 }],
      });

      await listActiveOffers(mockReq as Request, mockRes as Response);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('so.origin_org_id != $1'),
        [validOrgId]
      );
      expect(mockJson).toHaveBeenCalledWith({
        data: [{ id: validOfferId, offered_payout: 40.0, stop_count: 3 }],
      });
    });
  });

  describe('acceptOffer', () => {
    it('should accept offer transactionally', async () => {
      mockReq.params = { id: validOfferId };
      mockReq.body = {
        driver_id: validDriverId,
        route_id: validRouteId,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ status: 'broadcasted', origin_org_id: competitorOrgId }],
          }) // SELECT check status
          .mockResolvedValueOnce({ rows: [{ max_seq: 4 }] }) // SELECT sequence
          .mockResolvedValueOnce({ rows: [] }) // UPDATE offer status
          .mockResolvedValueOnce({ rows: [] }) // UPDATE stop accepted
          .mockResolvedValueOnce({
            rows: [{ route_stop_id: validStopId, customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380cc1' }],
          }) // SELECT stops
          .mockResolvedValueOnce({ rows: [] }) // INSERT stop duplicate
          .mockResolvedValueOnce({ rows: [] }) // UPDATE original stop status
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await acceptOffer(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subcontract_offers'),
        [expect.any(String), validOfferId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subcontract_stops'),
        [validOrgId, validDriverId, validOfferId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockJson).toHaveBeenCalledWith({ message: 'Subcontract offer accepted successfully.' });
    });
  });

  describe('submitProof', () => {
    it('should upload service proof and release escrow', async () => {
      mockReq.params = { stopId: validStopId };
      mockReq.body = {
        proof_photo_url: 'https://cloudinary.com/plow/proof.jpg',
        notes: 'Cleared full driveway',
      };
      mockReq.user!.driverId = validDriverId;

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ offer_id: validOfferId, route_stop_id: validStopId, accepted_by_org_id: validOrgId }],
          }) // SELECT check accepted org
          .mockResolvedValueOnce({ rows: [] }) // UPDATE subcontract stop proof
          .mockResolvedValueOnce({ rows: [{ customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380cc1' }] }) // SELECT customer
          .mockResolvedValueOnce({ rows: [] }) // UPDATE route stop complete
          .mockResolvedValueOnce({ rows: [] }) // SELECT incomplete check (no rows = all done)
          .mockResolvedValueOnce({ rows: [] }) // UPDATE offer to completed
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await submitProof(mockReq as Request, mockRes as Response);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subcontract_stops'),
        ['https://cloudinary.com/plow/proof.jpg', 'Cleared full driveway', validStopId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subcontract_offers'),
        [validOfferId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockJson).toHaveBeenCalledWith({ message: 'Proof of service submitted and escrow released.' });
    });
  });
});
