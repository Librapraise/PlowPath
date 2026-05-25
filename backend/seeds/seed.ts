/**
 * Idempotent demo seed. Wipes the customer/route/tracking tables and reinserts a
 * minimal but realistic dataset so a fresh dev environment is curl-able immediately.
 *
 * Seed credentials are dynamically loaded from environment variables in .env.
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

    // Clear in FK-safe order.
    await client.query('TRUNCATE gps_tracking, route_stops, routes, storm_events, customers, drivers, users RESTART IDENTITY CASCADE');

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@plowpath.local';
    const adminPhone = process.env.SEED_ADMIN_PHONE || '+15550000000';
    const driver1Phone = process.env.SEED_DRIVER1_PHONE || '+15551110001';
    const driver2Phone = process.env.SEED_DRIVER2_PHONE || '+15551110002';

    let adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = crypto.randomBytes(12).toString('hex');
      /* eslint-disable no-console */
      console.warn('\n======================================================================');
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

    const adminHash = await bcrypt.hash(adminPassword, 10);
    const driverHash = await bcrypt.hash(driverPassword, 10);

    const ownerRes = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'owner', $4) RETURNING user_id`,
      [adminEmail, adminPhone, adminHash, 'PlowPath Admin'],
    );

    const driver1User = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`,
      [null, driver1Phone, driverHash, 'Mike Plowman'],
    );
    const driver2User = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`,
      [null, driver2Phone, driverHash, 'Sara Snow'],
    );

    const driver1 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING driver_id`,
      [driver1User.rows[0].user_id, 'Mike Plowman', driver1Phone, 28, 'F-350 plow'],
    );
    const driver2 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING driver_id`,
      [driver2User.rows[0].user_id, 'Sara Snow', driver2Phone, 28, 'Ram 2500 plow'],
    );

    const signStatuses = ['installed', 'removed', 'needs_service'] as const;
    const paymentStatuses = ['paid', 'pending', 'overdue'] as const;
    const methods = ['cash', 'check', 'card', 'ach', 'other'] as const;

    for (let idx = 0; idx < customers.length; idx++) {
      const c = customers[idx];
      const sign_status = signStatuses[idx % signStatuses.length];
      const payment_status = paymentStatuses[idx % paymentStatuses.length];
      const outstanding_balance = payment_status === 'paid' ? 0.00 : 150.00 + idx * 25;

      const custRes = await client.query<{ customer_id: string }>(
        `INSERT INTO customers (name, address, location, phone, status, property_type, sign_status, payment_status, outstanding_balance)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, 'active', 'residential', $6, $7, $8)
         RETURNING customer_id`,
        [c.name, c.address, c.lat, c.lon, c.phone, sign_status, payment_status, outstanding_balance],
      );

      const customerId = custRes.rows[0].customer_id;

      // Seed some payment records
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

    await client.query(
      `INSERT INTO storm_events (name, start_time, forecasted_accumulation, status)
       VALUES ($1, NOW(), $2, 'active')`,
      ['Demo Storm — 6"', 6],
    );

    await client.query('COMMIT');

    /* eslint-disable no-console */
    console.log('✔ Seed complete');
    console.log(`  Owner   id=${ownerRes.rows[0].user_id}`);
    console.log(`  Driver  Mike=${driver1.rows[0].driver_id}`);
    console.log(`  Driver  Sara=${driver2.rows[0].driver_id}`);
    console.log(`  Customers seeded: ${customers.length}`);
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
