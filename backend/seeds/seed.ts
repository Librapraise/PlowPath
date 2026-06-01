/**
 * Dual-mode seed script controlled by the SEED_MODE environment variable:
 *
 *   SEED_MODE=clean      — Wipes the customer/route/tracking tables first,
 *                          then inserts a fresh realistic dataset. Use for
 *                          local dev resets and CI pipelines.
 *
 *   SEED_MODE=additive   — (default if omitted) Safely upserts / skips
 *                          existing rows. Ideal for production bootstrapping
 *                          and staging top-ups where real data must not be lost.
 *
 * Usage examples:
 *   npx ts-node --transpile-only seeds/seed.ts                  # additive
 *   SEED_MODE=clean npx ts-node --transpile-only seeds/seed.ts  # full reset
 *   SEED_MODE=additive npm run seed                             # explicit additive
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// Determine the seeding mode
// ---------------------------------------------------------------------------
const SEED_MODE = (process.env.SEED_MODE ?? 'additive').toLowerCase();
const isClean = SEED_MODE === 'clean';

/* eslint-disable no-console */
console.log(`\n🌱 PlowPath Seed — Mode: ${isClean ? '🔴 CLEAN (full wipe + reinsert)' : '🟢 ADDITIVE (safe upsert, no truncate)'}\n`);
if (isClean) {
  console.warn('  ⚠️  CLEAN mode will permanently delete all existing rows in');
  console.warn('  ⚠️  customers, drivers, users, routes, storm_events, and GPS tracking.\n');
}
/* eslint-enable no-console */

interface CustomerSeed {
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone: string;
}

// Hand-picked Buffalo-area coordinates so seeding makes no Nominatim calls.
const customers: CustomerSeed[] = [
  { name: 'Acme Towers',       address: '100 Main St, Buffalo NY',         lat: 42.8864, lon: -78.8784, phone: '+17165550001' },
  { name: 'North Park HOA',    address: '210 Hertel Ave, Buffalo NY',      lat: 42.9489, lon: -78.8732, phone: '+17165550002' },
  { name: 'Allentown Cafe',    address: '88 Allen St, Buffalo NY',         lat: 42.9039, lon: -78.8728, phone: '+17165550003' },
  { name: 'Larkinville Plaza', address: '745 Seneca St, Buffalo NY',       lat: 42.8843, lon: -78.8517, phone: '+17165550004' },
  { name: 'Elmwood Apartments',address: '900 Elmwood Ave, Buffalo NY',     lat: 42.9156, lon: -78.8784, phone: '+17165550005' },
  { name: 'University Heights',address: '3435 Main St, Buffalo NY',        lat: 42.9531, lon: -78.8190, phone: '+17165550006' },
  { name: 'South Park Center', address: '2100 South Park Ave, Buffalo NY', lat: 42.8400, lon: -78.8211, phone: '+17165550007' },
  { name: 'West Side Bakery',  address: '420 Grant St, Buffalo NY',        lat: 42.9224, lon: -78.8915, phone: '+17165550008' },
  { name: 'Riverside Diner',   address: '1500 Niagara St, Buffalo NY',     lat: 42.9305, lon: -78.9015, phone: '+17165550009' },
  { name: 'Black Rock Pub',    address: '500 Amherst St, Buffalo NY',      lat: 42.9395, lon: -78.8970, phone: '+17165550010' },
];

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // -----------------------------------------------------------------------
    // CLEAN MODE: wipe all tables in FK-safe dependency order.
    // -----------------------------------------------------------------------
    if (isClean) {
      await client.query(
        'TRUNCATE gps_tracking, route_stops, routes, storm_events, customers, drivers, users RESTART IDENTITY CASCADE',
      );
      /* eslint-disable no-console */
      console.log('  🗑️  Database tables truncated.\n');
      /* eslint-enable no-console */
    }

    // -----------------------------------------------------------------------
    // Resolve credential values from env (or generate safe randoms).
    // -----------------------------------------------------------------------
    const adminEmail   = process.env.SEED_ADMIN_EMAIL   || 'admin@plowpath.local';
    const adminPhone   = process.env.SEED_ADMIN_PHONE   || '+15550000000';
    const driver1Phone = process.env.SEED_DRIVER1_PHONE || '+15551110001';
    const driver2Phone = process.env.SEED_DRIVER2_PHONE || '+15551110002';

    let adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = crypto.randomBytes(12).toString('hex');
      /* eslint-disable no-console */
      console.warn('======================================================================');
      console.warn(`🔑 SECURITY NOTICE: SEED_ADMIN_PASSWORD not set in env.`);
      console.warn(`   Generated secure temporary password for ${adminEmail}:`);
      console.warn(`   👉 ${adminPassword}`);
      console.warn('======================================================================\n');
      /* eslint-enable no-console */
    }

    let driverPassword = process.env.SEED_DRIVER_PASSWORD;
    if (!driverPassword) {
      driverPassword = crypto.randomBytes(12).toString('hex');
      /* eslint-disable no-console */
      console.warn('======================================================================');
      console.warn(`🔑 SECURITY NOTICE: SEED_DRIVER_PASSWORD not set in env.`);
      console.warn(`   Generated secure temporary password for drivers:`);
      console.warn(`   👉 ${driverPassword}`);
      console.warn('======================================================================\n');
      /* eslint-enable no-console */
    }

    const adminHash  = await bcrypt.hash(adminPassword,  10);
    const driverHash = await bcrypt.hash(driverPassword, 10);

    // -----------------------------------------------------------------------
    // USERS — INSERT (clean) or INSERT … ON CONFLICT DO NOTHING (additive).
    // In additive mode we still SELECT afterwards so we can retrieve the IDs.
    // -----------------------------------------------------------------------
    const ownerRes = await client.query<{ user_id: string }>(
      isClean
        ? `INSERT INTO users (email, phone, password_hash, role, name)
           VALUES ($1, $2, $3, 'owner', $4) RETURNING user_id`
        : `INSERT INTO users (email, phone, password_hash, role, name)
           VALUES ($1, $2, $3, 'owner', $4)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING user_id`,
      [adminEmail, adminPhone, adminHash, 'PlowPath Admin'],
    );

    const driver1User = await client.query<{ user_id: string }>(
      isClean
        ? `INSERT INTO users (email, phone, password_hash, role, name)
           VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`
        : `INSERT INTO users (phone, password_hash, role, name)
           VALUES ($1, $2, 'driver', $3)
           ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
           RETURNING user_id`,
      isClean
        ? [null, driver1Phone, driverHash, 'Mike Plowman']
        : [driver1Phone, driverHash, 'Mike Plowman'],
    );

    const driver2User = await client.query<{ user_id: string }>(
      isClean
        ? `INSERT INTO users (email, phone, password_hash, role, name)
           VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`
        : `INSERT INTO users (phone, password_hash, role, name)
           VALUES ($1, $2, 'driver', $3)
           ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
           RETURNING user_id`,
      isClean
        ? [null, driver2Phone, driverHash, 'Sara Snow']
        : [driver2Phone, driverHash, 'Sara Snow'],
    );

    // -----------------------------------------------------------------------
    // DRIVERS — upsert by user_id (phone is the natural key via users).
    // -----------------------------------------------------------------------
    const driver1 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING driver_id`,
      [driver1User.rows[0].user_id, 'Mike Plowman', driver1Phone, 28, 'F-350 plow'],
    );

    const driver2 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING driver_id`,
      [driver2User.rows[0].user_id, 'Sara Snow', driver2Phone, 28, 'Ram 2500 plow'],
    );

    // -----------------------------------------------------------------------
    // CUSTOMERS — INSERT (clean) or upsert by address (additive).
    // -----------------------------------------------------------------------
    const signStatuses    = ['installed', 'removed', 'needs_service'] as const;
    const paymentStatuses = ['paid', 'pending', 'overdue'] as const;
    const methods         = ['cash', 'check', 'card', 'ach', 'other'] as const;

    let customersInserted = 0;
    let customersSkipped  = 0;

    for (let idx = 0; idx < customers.length; idx++) {
      const c = customers[idx];
      const sign_status       = signStatuses[idx % signStatuses.length];
      const payment_status    = paymentStatuses[idx % paymentStatuses.length];
      const outstanding_balance = payment_status === 'paid' ? 0.00 : 150.00 + idx * 25;

      const custRes = await client.query<{ customer_id: string; inserted: boolean }>(
        isClean
          ? `INSERT INTO customers (name, address, location, phone, status, property_type, sign_status, payment_status, outstanding_balance)
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, 'active', 'residential', $6, $7, $8)
             RETURNING customer_id, true AS inserted`
          : `INSERT INTO customers (name, address, location, phone, status, property_type, sign_status, payment_status, outstanding_balance)
             SELECT $1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, 'active', 'residential', $6, $7, $8
             WHERE NOT EXISTS (SELECT 1 FROM customers WHERE address = $2 AND deleted_at IS NULL)
             RETURNING customer_id, true AS inserted`,
        [c.name, c.address, c.lat, c.lon, c.phone, sign_status, payment_status, outstanding_balance],
      );

      if (custRes.rows.length === 0) {
        // Row already existed — skip payment record seeding to avoid duplicates
        customersSkipped++;
        continue;
      }

      customersInserted++;
      const customerId = custRes.rows[0].customer_id;

      // Seed some payment records for newly inserted customers only
      if (idx % 2 === 0) {
        await client.query(
          `INSERT INTO payment_records (customer_id, amount, paid_at, method, notes)
           VALUES ($1, $2, NOW() - INTERVAL '10 days', $3, $4)`,
          [customerId, 75.00, methods[idx % methods.length], `Initial deposit for ${c.name}`],
        );
      }
      if (idx % 3 === 0) {
        await client.query(
          `INSERT INTO payment_records (customer_id, amount, paid_at, method, notes)
           VALUES ($1, $2, NOW() - INTERVAL '2 days', $3, $4)`,
          [customerId, 50.00, methods[(idx + 1) % methods.length], `Follow up payment for ${c.name}`],
        );
      }
    }

    // -----------------------------------------------------------------------
    // STORM EVENT — skip if one already exists in additive mode.
    // -----------------------------------------------------------------------
    if (isClean) {
      await client.query(
        `INSERT INTO storm_events (name, start_time, forecasted_accumulation, status)
         VALUES ($1, NOW(), $2, 'active')`,
        ['Demo Storm — 6"', 6],
      );
    } else {
      const existing = await client.query(
        `SELECT 1 FROM storm_events WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
        ['Demo Storm — 6"'],
      );
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO storm_events (name, start_time, forecasted_accumulation, status)
           VALUES ($1, NOW(), $2, 'active')`,
          ['Demo Storm — 6"', 6],
        );
      }
    }

    await client.query('COMMIT');

    /* eslint-disable no-console */
    console.log('✅ Seed complete');
    console.log(`   Owner     id=${ownerRes.rows[0].user_id}  (${adminEmail})`);
    console.log(`   Driver    Mike=${driver1.rows[0].driver_id}`);
    console.log(`   Driver    Sara=${driver2.rows[0].driver_id}`);
    console.log(`   Customers inserted: ${customersInserted}  skipped (already exist): ${customersSkipped}`);
    console.log();
    /* eslint-enable no-console */
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
