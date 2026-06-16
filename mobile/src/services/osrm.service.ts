import axios from 'axios';

export interface OsrmStep {
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number]; // [lon, lat]
  };
  name: string;
  distance: number; // in meters
}

export interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates: [number, number][]; // [lon, lat]
      type: string;
    };
    legs: Array<{
      steps: OsrmStep[];
    }>;
  }>;
}

export interface RouteData {
  steps: OsrmStep[];
  geometry: [number, number][]; // [lon, lat]
}

/**
 * Fetches turn-by-turn driving steps from OSRM public API.
 */
export async function fetchRouteSteps(
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number
): Promise<OsrmStep[]> {
  const data = await fetchRouteData(originLon, originLat, destLon, destLat);
  return data ? data.steps : [];
}

function isValidCoordinate(lon: number, lat: number): boolean {
  if (lon === undefined || lon === null || isNaN(lon)) return false;
  if (lat === undefined || lat === null || isNaN(lat)) return false;
  // Check for (0,0) or close to it (e.g. uninitialized coords)
  if (Math.abs(lon) < 0.0001 && Math.abs(lat) < 0.0001) return false;
  // Latitude must be within [-90, 90] and Longitude [-180, 180]
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

/**
 * Fetches routing steps and route geometry (geojson coordinates) from OSRM.
 */
export async function fetchRouteData(
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number
): Promise<RouteData | null> {
  if (!isValidCoordinate(originLon, originLat) || !isValidCoordinate(destLon, destLat)) {
    return null;
  }

  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?steps=true&geometries=geojson`;
    const response = await axios.get<OsrmRouteResponse>(url, { timeout: 10000 });
    
    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        steps: route.legs[0].steps,
        geometry: route.geometry?.coordinates || [],
      };
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log(`No driving route found between points (${originLat}, ${originLon}) and (${destLat}, ${destLon}) (400 Bad Request)`);
    } else {
      console.error('Failed to fetch OSRM route details:', error);
    }
    return null;
  }
}
