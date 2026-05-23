import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface RouteStop {
  stop_id: string;
  customer_id: string;
  sequence_number: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  name: string;
  address: string;
  access_notes: string | null;
  phone: string | null;
  lat: number;
  lon: number;
  arrival_time: string | null;
  completion_time: string | null;
  notes: string | null;
}

export interface OfflineRoute {
  route_id: string;
  route_name: string;
  status: string;
  total_distance: number;
  osrm_steps: Array<{ instruction: string; distance_m: number; duration_s: number; location: [number, number] }> | null;
  stops: RouteStop[];
  downloaded_at: string;
}

const ROUTE_KEY = (routeId: string) => `plowpath.route.${routeId}`;

/** Fetch a route from the server and persist for offline navigation. */
export async function downloadRoute(routeId: string): Promise<OfflineRoute> {
  const { data } = await api.get<OfflineRoute>(`/routes/${routeId}`);
  const payload: OfflineRoute = { ...data, downloaded_at: new Date().toISOString() };
  await AsyncStorage.setItem(ROUTE_KEY(routeId), JSON.stringify(payload));
  return payload;
}

export async function loadRouteOffline(routeId: string): Promise<OfflineRoute | null> {
  const raw = await AsyncStorage.getItem(ROUTE_KEY(routeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflineRoute;
  } catch {
    return null;
  }
}

export async function markStopStatus(
  routeId: string,
  stopId: string,
  status: RouteStop['status'],
  notes?: string,
): Promise<void> {
  // Always update local cache first for instant UI response and offline consistency
  const offlineRoute = await loadRouteOffline(routeId);
  if (offlineRoute) {
    const stop = offlineRoute.stops.find((s) => s.stop_id === stopId);
    if (stop) {
      stop.status = status;
      if (notes !== undefined) stop.notes = notes;
      if (status === 'in_progress') stop.arrival_time = new Date().toISOString();
      if (status === 'completed') stop.completion_time = new Date().toISOString();
      await AsyncStorage.setItem(ROUTE_KEY(routeId), JSON.stringify(offlineRoute));
    }
  }

  try {
    await api.put(`/routes/${routeId}/stops/${stopId}`, { status, notes });
  } catch (err) {
    // If the network call failed, enqueue it for offline sync
    const { enqueueStopStatus } = require('./offline.service');
    await enqueueStopStatus(routeId, stopId, status, notes);
  }
}

export async function markRouteCompleted(routeId: string, status: 'completed'): Promise<void> {
  const offlineRoute = await loadRouteOffline(routeId);
  if (offlineRoute) {
    offlineRoute.status = status;
    await AsyncStorage.setItem(ROUTE_KEY(routeId), JSON.stringify(offlineRoute));
  }

  try {
    await api.put(`/routes/${routeId}`, { status });
  } catch (err) {
    // Standard best effort or enqueue (or just update local state)
    console.error('Failed to mark route completed on server', err);
  }
}
