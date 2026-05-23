import * as turf from '@turf/turf';

export interface OptStop {
  id: string;
  lat: number;
  lon: number;
}

export function calculateDistanceMiles(a: OptStop, b: OptStop): number {
  return turf.distance(turf.point([a.lon, a.lat]), turf.point([b.lon, b.lat]), { units: 'miles' });
}

/**
 * Nearest-neighbor TSP approximation. O(n^2) — fine for the PRD's
 * stated upper bound of 500 properties (~250k distance calls, sub-second on Node).
 * The `start` argument is optional; if omitted we start at stops[0].
 */
export function optimizeRoute(stops: OptStop[], start?: OptStop): OptStop[] {
  if (stops.length === 0) return [];
  if (stops.length === 1) return [stops[0]];

  const remaining = [...stops];
  let current: OptStop;

  if (start) {
    current = start;
  } else {
    current = remaining.shift() as OptStop;
  }

  const ordered: OptStop[] = start ? [] : [current];

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = calculateDistanceMiles(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = calculateDistanceMiles(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
}

export function totalRouteDistance(stops: OptStop[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += calculateDistanceMiles(stops[i], stops[i + 1]);
  }
  return total;
}
