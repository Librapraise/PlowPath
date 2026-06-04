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
    legs: Array<{
      steps: OsrmStep[];
    }>;
  }>;
}

/**
 * Fetches turn-by-turn driving steps from OSRM public API.
 * 
 * @param originLon Starting Longitude
 * @param originLat Starting Latitude
 * @param destLon Destination Longitude
 * @param destLat Destination Latitude
 * @returns Array of routing steps
 */
export async function fetchRouteSteps(
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number
): Promise<OsrmStep[]> {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?steps=true&geometries=geojson`;
    const response = await axios.get<OsrmRouteResponse>(url, { timeout: 10000 });
    
    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      return response.data.routes[0].legs[0].steps;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch OSRM route:', error);
    return [];
  }
}
