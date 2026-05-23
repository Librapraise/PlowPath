/**
 * Idempotent demo seed. Wipes the customer/route/tracking tables and reinserts a
 * minimal but realistic dataset so a fresh dev environment is curl-able immediately.
 *
 *   admin@plowpath.local / admin123          (owner)
 *   +15551110001 / driver123                 (driver — Mike)
 *   +15551110002 / driver123                 (driver — Sara)
 */
import 'dotenv/config';
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

    const adminHash = await bcrypt.hash('admin123', 10);
    const driverHash = await bcrypt.hash('driver123', 10);

    const ownerRes = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'owner', $4) RETURNING user_id`,
      ['admin@plowpath.local', '+15550000000', adminHash, 'PlowPath Admin'],
    );

    const driver1User = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`,
      [null, '+15551110001', driverHash, 'Mike Plowman'],
    );
    const driver2User = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone, password_hash, role, name)
       VALUES ($1, $2, $3, 'driver', $4) RETURNING user_id`,
      [null, '+15551110002', driverHash, 'Sara Snow'],
    );

    const driver1 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING driver_id`,
      [driver1User.rows[0].user_id, 'Mike Plowman', '+15551110001', 28, 'F-350 plow'],
    );
    const driver2 = await client.query<{ driver_id: string }>(
      `INSERT INTO drivers (user_id, name, phone, hourly_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING driver_id`,
      [driver2User.rows[0].user_id, 'Sara Snow', '+15551110002', 28, 'Ram 2500 plow'],
    );

    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (name, address, location, phone, status, property_type)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, 'active', 'residential')`,
        [c.name, c.address, c.lat, c.lon, c.phone],
      );
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
