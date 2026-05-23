import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
});

pool.on('error', (err) => {
  // Connection-level errors are logged here so we surface them in production.
  // eslint-disable-next-line no-console
  console.error('Unexpected PG pool error', err);
});

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await pool.query<T>(text, params as never);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}
