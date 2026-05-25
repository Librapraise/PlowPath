import type { Request, Response } from 'express';
import { z } from 'zod';
import { query, pool } from '../config/db';
import { HttpError } from '../utils/httpError';
import { geocodeAddress } from '../services/geocoding.service';
import { logger } from '../utils/logger';

const upsertSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(3),
  phone: z.string().max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  property_type: z.enum(['residential', 'commercial']).optional(),
  driveway_type: z.string().max(64).optional().nullable(),
  access_notes: z.string().optional().nullable(),
  // If lat/lon omitted, we'll geocode the address.
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  // Phase 3.5 Fields
  outstanding_balance: z.number().optional(),
  payment_status: z.enum(['paid', 'pending', 'overdue']).optional(),
  sign_status: z.enum(['installed', 'removed', 'needs_service']).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
});

// PostGIS returns location as either GeoJSON (if we ST_AsGeoJSON it) or a hex blob; we project explicitly.
const SELECT_COLS = `
  customer_id, name, address,
  ST_Y(location::geography) AS lat,
  ST_X(location::geography) AS lon,
  phone, email, status, property_type, payment_status,
  driveway_type, access_notes, sign_status, outstanding_balance,
  created_at, updated_at
`;

export async function list(req: Request, res: Response): Promise<void> {
  const { status, search, page, per_page } = listQuerySchema.parse(req.query);
  const offset = (page - 1) * per_page;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    conditions.push(`(name ILIKE $${i} OR address ILIKE $${i} OR phone ILIKE $${i})`);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  params.push(per_page, offset);
  const dataPromise = query(
    `SELECT ${SELECT_COLS} FROM customers ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countPromise = query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM customers ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  const [data, count] = await Promise.all([dataPromise, countPromise]);
  res.json({
    data: data.rows,
    page,
    per_page,
    total: Number(count.rows[0]?.total ?? 0),
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT ${SELECT_COLS} FROM customers WHERE customer_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = upsertSchema.parse(req.body);
  let lat = body.lat;
  let lon = body.lon;
  if (lat == null || lon == null) {
    try {
      const g = await geocodeAddress(body.address);
      lat = g.lat;
      lon = g.lon;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn(`Geocoding failed for "${body.address}" (${(err as Error).message}). Falling back to Buffalo coordinates [42.8864, -78.8784] in ${process.env.NODE_ENV} mode.`);
        lat = 42.8864;
        lon = -78.8784;
      } else {
        throw err;
      }
    }
  }
  const { rows } = await query(
    `INSERT INTO customers
       (name, address, location, phone, email, status, property_type, driveway_type, access_notes, sign_status, payment_status, outstanding_balance)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
             $5, $6, COALESCE($7, 'active')::customer_status, COALESCE($8, 'residential')::customer_prop_type, $9, $10,
             COALESCE($11, 'removed')::customer_sign_status, COALESCE($12, 'pending')::customer_pay_status, COALESCE($13, 0.00)::numeric)
     RETURNING ${SELECT_COLS}`,
    [
      body.name,
      body.address,
      lat,
      lon,
      body.phone ?? null,
      body.email ?? null,
      body.status ?? null,
      body.property_type ?? null,
      body.driveway_type ?? null,
      body.access_notes ?? null,
      body.sign_status ?? null,
      body.payment_status ?? null,
      body.outstanding_balance ?? null,
    ],
  );
  res.status(201).json(rows[0]);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = upsertSchema.partial().parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];

  const push = (sqlFragment: string, value: unknown) => {
    params.push(value);
    fields.push(sqlFragment.replace('?', `$${params.length}`));
  };

  if (body.name !== undefined) push('name = ?', body.name);
  if (body.address !== undefined) push('address = ?', body.address);
  if (body.phone !== undefined) push('phone = ?', body.phone);
  if (body.email !== undefined) push('email = ?', body.email);
  if (body.status !== undefined) push('status = ?::customer_status', body.status);
  if (body.property_type !== undefined) push('property_type = ?::customer_prop_type', body.property_type);
  if (body.driveway_type !== undefined) push('driveway_type = ?', body.driveway_type);
  if (body.access_notes !== undefined) push('access_notes = ?', body.access_notes);
  if (body.lat !== undefined && body.lon !== undefined) {
    params.push(body.lon, body.lat);
    fields.push(
      `location = ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`,
    );
  }
  // Phase 3.5 Fields
  if (body.sign_status !== undefined) push('sign_status = ?::customer_sign_status', body.sign_status);
  if (body.payment_status !== undefined) push('payment_status = ?::customer_pay_status', body.payment_status);
  if (body.outstanding_balance !== undefined) push('outstanding_balance = ?::numeric', body.outstanding_balance);

  if (fields.length === 0) throw HttpError.badRequest('No updatable fields supplied');

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE customers SET ${fields.join(', ')}, updated_at = NOW()
      WHERE customer_id = $${params.length} AND deleted_at IS NULL
      RETURNING ${SELECT_COLS}`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound();
  res.json(rows[0]);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { rowCount } = await query(
    `UPDATE customers SET deleted_at = NOW() WHERE customer_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (rowCount === 0) throw HttpError.notFound();
  res.status(204).end();
}

export async function geocodePreview(req: Request, res: Response): Promise<void> {
  const address = req.query.address as string;
  if (!address) throw HttpError.badRequest('Address parameter is required');
  try {
    const result = await geocodeAddress(address);
    res.json(result);
  } catch (err) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn(`Geocoding preview failed for "${address}" (${(err as Error).message}). Returning mock Buffalo coordinates [42.8864, -78.8784] in ${process.env.NODE_ENV} mode.`);
      res.json({
        lat: 42.8864,
        lon: -78.8784,
        displayName: `${address} (Mocked Buffalo Geocode)`
      });
    } else {
      throw err;
    }
  }
}

// ==========================================
// Phase 3.5 Payments & CSV Endpoints
// ==========================================

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'check', 'card', 'ach', 'other']),
  notes: z.string().max(1000).optional().nullable(),
});

export async function listPayments(req: Request, res: Response): Promise<void> {
  const customerId = req.params.id;
  const { rows } = await query(
    `SELECT payment_id, customer_id, amount, paid_at, method, notes, created_at
       FROM payment_records
      WHERE customer_id = $1
      ORDER BY paid_at DESC`,
    [customerId],
  );
  res.json(rows);
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const customerId = req.params.id;
  const body = paymentSchema.parse(req.body);

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Verify customer exists and get current outstanding balance
    const { rows: custRows } = await dbClient.query<{ outstanding_balance: string }>(
      `SELECT outstanding_balance FROM customers WHERE customer_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [customerId],
    );
    if (!custRows[0]) {
      throw HttpError.notFound('Customer not found');
    }

    const currentBalance = Number(custRows[0].outstanding_balance || 0);
    const newBalance = Math.max(0, currentBalance - body.amount);
    const newStatus = newBalance <= 0 ? 'paid' : 'pending';

    // 2. Insert payment record
    const { rows: paymentRows } = await dbClient.query(
      `INSERT INTO payment_records (customer_id, amount, method, notes)
       VALUES ($1, $2, $3::payment_method, $4)
       RETURNING payment_id, customer_id, amount, paid_at, method, notes`,
      [customerId, body.amount, body.method, body.notes || null],
    );

    // 3. Update customer outstanding balance and payment status
    await dbClient.query(
      `UPDATE customers
          SET outstanding_balance = $1,
              payment_status = $2::customer_pay_status,
              updated_at = NOW()
        WHERE customer_id = $3`,
      [newBalance, newStatus, customerId],
    );

    await dbClient.query('COMMIT');
    res.status(201).json(paymentRows[0]);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}

export async function getCustomerHistory(req: Request, res: Response): Promise<void> {
  const customerId = req.params.id;
  const { rows } = await query(
    `SELECT rs.stop_id, rs.sequence_number, rs.status, rs.arrival_time, rs.completion_time, rs.notes, rs.pass_number,
            r.route_name, r.status AS route_status,
            s.name AS storm_name,
            d.name AS driver_name
       FROM route_stops rs
       JOIN routes r ON r.route_id = rs.route_id
       JOIN storm_events s ON s.storm_id = r.storm_id
       JOIN drivers d ON d.driver_id = r.driver_id
      WHERE rs.customer_id = $1
      ORDER BY rs.completion_time DESC, rs.created_at DESC`,
    [customerId],
  );
  res.json(rows);
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const { rows } = await query<any>(
    `SELECT name, address, ST_Y(location::geography) AS lat, ST_X(location::geography) AS lon,
            phone, email, status, property_type, payment_status, outstanding_balance, sign_status
       FROM customers
      WHERE deleted_at IS NULL
      ORDER BY name ASC`,
  );

  const headers = ['Name', 'Address', 'Latitude', 'Longitude', 'Phone', 'Email', 'Status', 'Property Type', 'Payment Status', 'Outstanding Balance', 'Sign Status'];
  const csvLines = [headers.join(',')];

  for (const r of rows) {
    const values = [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      r.lat ?? '',
      r.lon ?? '',
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      r.status,
      r.property_type,
      r.payment_status,
      r.outstanding_balance,
      r.sign_status,
    ];
    csvLines.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  res.status(200).send(csvLines.join('\n'));
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  const { csv } = req.body;
  if (!csv) {
    throw HttpError.badRequest('CSV content is required in the "csv" field');
  }

  const lines = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
  if (lines.length <= 1) {
    throw HttpError.badRequest('CSV must contain a header and at least one data row');
  }

  const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const nameIdx = headers.indexOf('name');
  const addrIdx = headers.indexOf('address');
  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');
  const phoneIdx = headers.indexOf('phone');
  const emailIdx = headers.indexOf('email');
  const typeIdx = headers.indexOf('property type');
  const balanceIdx = headers.indexOf('outstanding balance');
  const signIdx = headers.indexOf('sign status');

  if (nameIdx === -1 || addrIdx === -1) {
    throw HttpError.badRequest('CSV must at least contain "Name" and "Address" columns');
  }

  const imported = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV row parser splitting by comma but respecting double quotes
    const rowMatches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const row = rowMatches.map((v: string) => v.trim().replace(/^["']|["']$/g, ''));

    const name = row[nameIdx];
    const address = row[addrIdx];

    if (!name || !address) {
      errors.push(`Row ${i}: Missing Name or Address`);
      continue;
    }

    let lat = latIdx !== -1 && row[latIdx] ? Number(row[latIdx]) : null;
    let lon = lonIdx !== -1 && row[lonIdx] ? Number(row[lonIdx]) : null;

    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      try {
        // Respect API rate limits sequentially
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const geocode = await geocodeAddress(address);
        lat = geocode.lat;
        lon = geocode.lon;
      } catch (err) {
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          lat = 42.8864;
          lon = -78.8784;
        } else {
          errors.push(`Row ${i} ("${name}"): Geocoding failed - ${(err as Error).message}`);
          continue;
        }
      }
    }

    const phone = phoneIdx !== -1 ? row[phoneIdx] : null;
    const email = emailIdx !== -1 ? row[emailIdx] : null;
    const propertyType = typeIdx !== -1 && row[typeIdx] === 'commercial' ? 'commercial' : 'residential';
    const balance = balanceIdx !== -1 && row[balanceIdx] ? Number(row[balanceIdx]) : 0.00;
    const signStatus = signIdx !== -1 && ['installed', 'removed', 'needs_service'].includes(row[signIdx]) ? row[signIdx] : 'removed';
    const payStatus = balance <= 0 ? 'paid' : 'pending';

    try {
      const { rows: inserted } = await query(
        `INSERT INTO customers
           (name, address, location, phone, email, status, property_type, sign_status, payment_status, outstanding_balance)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6, 'active', $7::customer_prop_type, $8::customer_sign_status, $9::customer_pay_status, $10)
         RETURNING ${SELECT_COLS}`,
        [name, address, lat, lon, phone || null, email || null, propertyType, signStatus, payStatus, balance],
      );
      imported.push(inserted[0]);
    } catch (err) {
      errors.push(`Row ${i} ("${name}"): Database insert failed - ${(err as Error).message}`);
    }
  }

  res.json({
    success: true,
    imported_count: imported.length,
    errors_count: errors.length,
    errors,
  });
}

