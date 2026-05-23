import axios from 'axios';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

export interface Waypoint {
  lat: number;
  lon: number;
}

export interface TurnInstruction {
  instruction: string;
  distance_m: number;
  duration_s: number;
  location: [number, number]; // [lon, lat] from OSRM
}

export interface OsrmRoute {
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  distance: number;
  duration: number;
  legs: unknown[];
  steps: TurnInstruction[];
}

const client = axios.create({
  baseURL: env.OSRM_BASE_URL,
  timeout: 15_000,
});

export async function getDirections(waypoints: Waypoint[]): Promise<OsrmRoute> {
  if (waypoints.length < 2) {
    throw HttpError.badRequest('Need at least two waypoints to compute a route');
  }

  const coords = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
  const { data } = await client.get<{ routes: Array<Record<string, unknown>> }>(
    `/route/v1/driving/${coords}`,
    { params: { overview: 'full', steps: true, geometries: 'geojson' } },
  );

  if (!data.routes?.length) {
    throw HttpError.badRequest('OSRM returned no route for the given waypoints');
  }

  const route = data.routes[0] as {
    geometry: OsrmRoute['geometry'];
    distance: number;
    duration: number;
    legs: Array<{ steps: Array<Record<string, unknown>> }>;
  };

  const steps: TurnInstruction[] = route.legs.flatMap((leg) =>
    leg.steps.map((step) => {
      const maneuver = step.maneuver as { instruction?: string; location: [number, number] };
      return {
        instruction: maneuver.instruction ?? buildInstruction(step),
        distance_m: Number(step.distance ?? 0),
        duration_s: Number(step.duration ?? 0),
        location: maneuver.location,
      };
    }),
  );

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    legs: route.legs,
    steps,
  };
}

// OSRM's free server often omits maneuver.instruction; synthesize a usable string.
function buildInstruction(step: Record<string, unknown>): string {
  const maneuver = (step.maneuver as { type?: string; modifier?: string }) ?? {};
  const name = (step.name as string) || 'the road';
  const parts = [maneuver.type ?? 'continue', maneuver.modifier, 'onto', name].filter(Boolean);
  return parts.join(' ');
}
