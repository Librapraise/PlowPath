import axios from 'axios';
import { env } from '../config/env';
import { sleep } from '../utils/sleep';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

const NOMINATIM_FAIR_USE_DELAY_MS = 1100;

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName?: string;
}

const client = axios.create({
  baseURL: env.NOMINATIM_BASE_URL,
  timeout: 10_000,
  headers: {
    // Nominatim ToS requires a meaningful User-Agent identifying the app.
    'User-Agent': env.NOMINATIM_USER_AGENT,
    'Accept-Language': 'en',
  },
});

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) throw HttpError.badRequest('Address is empty');

  const { data } = await client.get<Array<{ lat: string; lon: string; display_name: string }>>(
    '/search',
    { params: { q: trimmed, format: 'json', limit: 1, addressdetails: 0 } },
  );

  if (!data || data.length === 0) {
    throw HttpError.notFound(`Address not found: ${trimmed}`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

/**
 * Batch-geocode an array of addresses while respecting Nominatim's 1 req/sec fair-use limit.
 * Results are returned in input order; failures are returned as `null` so a partial batch
 * doesn't lose successful lookups.
 */
export async function batchGeocode(addresses: string[]): Promise<Array<GeocodeResult | null>> {
  const results: Array<GeocodeResult | null> = [];
  for (let i = 0; i < addresses.length; i++) {
    try {
      results.push(await geocodeAddress(addresses[i]));
    } catch (err) {
      logger.warn('Geocode failed for "%s": %s', addresses[i], (err as Error).message);
      results.push(null);
    }
    if (i < addresses.length - 1) await sleep(NOMINATIM_FAIR_USE_DELAY_MS);
  }
  return results;
}
