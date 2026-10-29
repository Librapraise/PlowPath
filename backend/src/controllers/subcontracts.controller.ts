import type { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { getIo } from '../sockets';

const broadcastSchema = z.object({
  route_stop_ids: z.array(z.string().uuid()).min(1),
  offered_payout: z.number().positive(),
  target_org_id: z.string().uuid().optional().nullable(),
});

const acceptSchema = z.object({
  driver_id: z.string().uuid(),
  route_id: z.string().uuid(),
});

const proofSchema = z.object({
  proof_photo_url: z.string().url(),
  notes: z.string().optional(),
});

export async function broadcastOffer(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const originOrgId = req.user.orgId;
  if (!originOrgId) throw HttpError.badRequest('User does not belong to an organization');

  const body = broadcastSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable RLS current_org_id session context
    await client.query(`SELECT set_config('app.current_org_id', $1, true)`, [originOrgId]);

    // 1. Create subcontract offer
    const offerRes = await client.query<{ id: string; offered_payout: string }>(
      `INSERT INTO subcontract_offers (origin_org_id, target_org_id, offered_payout, status)
       VALUES ($1, $2, $3, 'broadcasted')
       RETURNING id, origin_org_id, target_org_id, offered_payout, status, created_at`,
      [originOrgId, body.target_org_id ?? null, body.offered_payout],
    );
    const offerId = offerRes.rows[0].id;

    // 2. Link stops to the offer
    for (const stopId of body.route_stop_ids) {
      // Verify stop exists and belongs to a route of the origin org
      const stopCheck = await client.query(
        `SELECT rs.stop_id FROM route_stops rs
           JOIN routes r ON r.route_id = rs.route_id
          WHERE rs.stop_id = $1 AND r.org_id = $2`,
        [stopId, originOrgId],
      );

      if (stopCheck.rows.length === 0) {
        throw HttpError.forbidden(`Unauthorized or invalid route stop ID: ${stopId}`);
      }

      await client.query(
        `INSERT INTO subcontract_stops (offer_id, route_stop_id)
         VALUES ($1, $2)`,
        [offerId, stopId],
      );
    }

    await client.query('COMMIT');

    // Broadcast Socket event
    const ioServer = getIo();
    if (ioServer) {
      ioServer.to('dashboard').emit('subcontract:broadcast', {
        offerId,
        offeredPayout: body.offered_payout,
        stopCount: body.route_stop_ids.length,
        originOrgId,
      });
    }

    res.status(201).json(offerRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listActiveOffers(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const currentOrgId = req.user.orgId;
  if (!currentOrgId) throw HttpError.badRequest('User does not belong to an organization');

  // Query offers where status is broadcasted, origin is not current company, and targeted is either null or current company
  const { rows } = await query(
    `SELECT so.*, os.company_name AS origin_company_name,
            (SELECT COUNT(*) FROM subcontract_stops ss WHERE ss.offer_id = so.id) AS stop_count
       FROM subcontract_offers so
       JOIN organization_settings os ON os.settings_id = so.origin_org_id
      WHERE so.origin_org_id != $1
        AND (so.target_org_id IS NULL OR so.target_org_id = $1)
        AND so.status = 'broadcasted'
        AND so.deleted_at IS NULL
      ORDER BY so.created_at DESC`,
    [currentOrgId],
  );

  res.json({ data: rows });
}

export async function getOfferDetails(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const currentOrgId = req.user.orgId;

  const { id } = req.params;

  // Retrieve stops in the offer along with address and geolocation details
  const { rows } = await query(
    `SELECT ss.*, rs.status AS original_stop_status,
            c.name AS customer_name, c.address AS customer_address, 
            ST_Y(c.location::geometry) AS latitude, ST_X(c.location::geometry) AS longitude
       FROM subcontract_stops ss
       JOIN subcontract_offers so ON so.id = ss.offer_id
       JOIN route_stops rs ON rs.stop_id = ss.route_stop_id
       JOIN customers c ON c.customer_id = rs.customer_id
      WHERE ss.offer_id = $1 
        AND (so.origin_org_id = $2 OR so.target_org_id IS NULL OR so.target_org_id = $2 OR ss.accepted_by_org_id = $2)
        AND ss.deleted_at IS NULL`,
    [id, currentOrgId],
  );

  res.json({ data: rows });
}

export async function acceptOffer(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const currentOrgId = req.user.orgId;
  if (!currentOrgId) throw HttpError.badRequest('User does not belong to an organization');

  const { id } = req.params;
  const { driver_id, route_id } = acceptSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify offer status is still broadcasted
    const offerCheck = await client.query<{ status: string; origin_org_id: string }>(
      `SELECT status, origin_org_id FROM subcontract_offers WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );

    if (offerCheck.rows.length === 0) {
      throw HttpError.notFound('Subcontract offer not found');
    }

    const offer = offerCheck.rows[0];
    if (offer.status !== 'broadcasted') {
      throw HttpError.badRequest(`Subcontract offer cannot be accepted in state: ${offer.status}`);
    }

    if (offer.origin_org_id === currentOrgId) {
      throw HttpError.badRequest('Cannot accept your own subcontract offer');
    }

    // 2. Set current sequence max on route
    const seqRes = await client.query<{ max_seq: number }>(
      `SELECT COALESCE(MAX(sequence_number), 0) AS max_seq FROM route_stops WHERE route_id = $1`,
      [route_id],
    );
    let nextSeq = seqRes.rows[0].max_seq + 1;

    // 3. Update offer and link tables
    await client.query(
      `UPDATE subcontract_offers 
          SET status = 'accepted', escrow_payment_intent_id = $1, updated_at = NOW() 
        WHERE id = $2`,
      [`mock_pi_${Math.random().toString(36).substring(7)}`, id],
    );

    await client.query(
      `UPDATE subcontract_stops 
          SET accepted_by_org_id = $1, assigned_driver_id = $2, updated_at = NOW() 
        WHERE offer_id = $3`,
      [currentOrgId, driver_id, id],
    );

    // 4. Retrieve subcontracted stop information
    const stopsRes = await client.query<{ route_stop_id: string; customer_id: string }>(
      `SELECT ss.route_stop_id, rs.customer_id
         FROM subcontract_stops ss
         JOIN route_stops rs ON rs.stop_id = ss.route_stop_id
        WHERE ss.offer_id = $1`,
      [id],
    );

    // 5. Duplicate route stops into the competitor route sequence
    for (const stop of stopsRes.rows) {
      await client.query(
        `INSERT INTO route_stops (route_id, customer_id, sequence_number, status)
         VALUES ($1, $2, $3, 'pending')`,
        [route_id, stop.customer_id, nextSeq++],
      );

      // Mark the original route stop as skipped on the origin route
      await client.query(
        `UPDATE route_stops SET status = 'skipped', notes = $1, updated_at = NOW() WHERE stop_id = $2`,
        [`Subcontracted out to partner company (Offer ID: ${id})`, stop.route_stop_id],
      );
    }

    await client.query('COMMIT');

    // Broadcast Socket event
    const ioServer = getIo();
    if (ioServer) {
      ioServer.to('dashboard').emit('subcontract:accepted', {
        offerId: id,
        acceptedByOrgId: currentOrgId,
        routeId: route_id,
        driverId: driver_id,
      });
    }

    res.json({ message: 'Subcontract offer accepted successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function submitProof(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const currentOrgId = req.user.orgId;

  const { stopId } = req.params; // subcontract_stop_id
  const body = proofSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify the subcontract stop belongs to accepted company
    const stopRes = await client.query<{ offer_id: string; route_stop_id: string; accepted_by_org_id: string }>(
      `SELECT offer_id, route_stop_id, accepted_by_org_id 
         FROM subcontract_stops 
        WHERE id = $1 AND deleted_at IS NULL`,
      [stopId],
    );

    if (stopRes.rows.length === 0) {
      throw HttpError.notFound('Subcontract stop not found');
    }

    const subStop = stopRes.rows[0];
    if (subStop.accepted_by_org_id !== currentOrgId) {
      throw HttpError.forbidden('Unauthorized to submit proof for this subcontracted stop');
    }

    // 2. Update the subcontract stop completion details
    await client.query(
      `UPDATE subcontract_stops 
          SET completed_at = NOW(), proof_photo_url = $1, notes = $2, updated_at = NOW()
        WHERE id = $3`,
      [body.proof_photo_url, body.notes ?? null, stopId],
    );

    // 3. Mark the corresponding route stop (and competitor's route stop if applicable) completed.
    // In our system, the original route stop in originating company remains 'skipped'. 
    // We want to find the corresponding route stop of the accepting company.
    // To do this, let's query the accepted route stop using the customer_id
    const customerRes = await client.query<{ customer_id: string }>(
      `SELECT customer_id FROM route_stops WHERE stop_id = $1`,
      [subStop.route_stop_id],
    );
    const customerId = customerRes.rows[0]?.customer_id;

    if (customerId) {
      // Set any pending stops of this customer on the current driver's routes as completed
      await client.query(
        `UPDATE route_stops 
            SET status = 'completed', completion_time = NOW(), notes = $1, updated_at = NOW()
          WHERE customer_id = $2 AND status = 'pending' AND route_id IN (
            SELECT route_id FROM routes WHERE driver_id = $3
          )`,
        [body.notes ?? 'Completed subcontracted job', customerId, req.user.driverId],
      );
    }

    // 4. Check if all stops in the offer are completed
    const incompleteRes = await client.query(
      `SELECT id FROM subcontract_stops 
        WHERE offer_id = $1 AND completed_at IS NULL AND deleted_at IS NULL`,
      [subStop.offer_id],
    );

    if (incompleteRes.rows.length === 0) {
      // Complete the offer and mock escrow settlement
      await client.query(
        `UPDATE subcontract_offers 
            SET status = 'completed', updated_at = NOW() 
          WHERE id = $1`,
        [subStop.offer_id],
      );
      
      // Log Stripe escrow payout trigger
      console.log(`[Stripe Escrow Release] Offer ${subStop.offer_id} completed. Releasing payout.`);
    }

    await client.query('COMMIT');

    const ioServer = getIo();
    if (ioServer) {
      ioServer.to('dashboard').emit('subcontract:completed', {
        stopId,
        offerId: subStop.offer_id,
        proofPhotoUrl: body.proof_photo_url,
      });
    }

    res.json({ message: 'Proof of service submitted and escrow released.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
