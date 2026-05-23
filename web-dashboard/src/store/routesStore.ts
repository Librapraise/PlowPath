import { create } from 'zustand';
import { api } from '../services/api';
import { useToastStore } from './toastStore';

export interface RouteStop {
  stop_id: string;
  sequence_number: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  arrival_time: string | null;
  completion_time: string | null;
  notes: string | null;
  customer_id: string;
  name: string;
  address: string;
  access_notes: string | null;
  phone: string | null;
  lat: number;
  lon: number;
}

export interface Route {
  route_id: string;
  storm_id: string;
  driver_id: string;
  route_name: string;
  status: 'assigned' | 'in_progress' | 'completed';
  start_time: string | null;
  end_time: string | null;
  total_distance: number;
  stop_count?: number;
  osrm_geometry?: string | { type: 'LineString'; coordinates: Array<[number, number]> } | null;
  osrm_steps?: string | null;
  created_at?: string;
  updated_at?: string;
  stops?: RouteStop[];
}

interface RoutesState {
  routes: Route[];
  currentRoute: Route | null;
  isLoading: boolean;
  error: string | null;

  fetchRoutes: (filters?: { storm_id?: string; driver_id?: string }) => Promise<void>;
  fetchRouteDetails: (id: string) => Promise<Route>;
  generateRoute: (params: {
    storm_id: string;
    driver_id: string;
    route_name: string;
    customer_ids: string[];
    start_lat?: number;
    start_lon?: number;
    include_directions?: boolean;
  }) => Promise<void>;
  updateRouteStatus: (id: string, status: Route['status']) => Promise<void>;
  updateStopStatus: (routeId: string, stopId: string, status: RouteStop['status'], notes?: string) => Promise<void>;
  broadcastSms: (id: string, message: string) => Promise<void>;
}

export const useRoutesStore = create<RoutesState>((set, get) => ({
  routes: [],
  currentRoute: null,
  isLoading: false,
  error: null,

  fetchRoutes: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ data: Route[] }>('/routes', { params: filters });
      set({ routes: data.data, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to load routes';
      set({ error: msg, isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  fetchRouteDetails: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<Route>(`/routes/${id}`);
      
      // Parse geometry if it came back as a string
      const parsedRoute = { ...data };
      if (typeof parsedRoute.osrm_geometry === 'string') {
        try {
          parsedRoute.osrm_geometry = JSON.parse(parsedRoute.osrm_geometry);
        } catch {
          // Keep as string if parsing failed
        }
      }
      
      set({ currentRoute: parsedRoute, isLoading: false });
      return parsedRoute;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to load route details';
      set({ error: msg, isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  generateRoute: async (params) => {
    set({ isLoading: true });
    try {
      await api.post('/routes/generate', {
        ...params,
        include_directions: params.include_directions ?? true,
      });
      set({ isLoading: false });
      useToastStore.getState().addToast('Route generated and optimized successfully', 'success');
      get().fetchRoutes();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to generate route';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  updateRouteStatus: async (id, status) => {
    try {
      await api.put(`/routes/${id}`, { status });
      useToastStore.getState().addToast(`Route status updated to ${status}`, 'success');
      get().fetchRouteDetails(id);
      get().fetchRoutes();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to update route status';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  updateStopStatus: async (routeId, stopId, status, notes) => {
    try {
      await api.put(`/routes/${routeId}/stops/${stopId}`, { status, notes });
      useToastStore.getState().addToast(`Stop status updated to ${status}`, 'success');
      get().fetchRouteDetails(routeId);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to update stop status';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  broadcastSms: async (id, message) => {
    set({ isLoading: true });
    try {
      await api.post(`/routes/${id}/broadcast-sms`, { message });
      set({ isLoading: false });
      useToastStore.getState().addToast('Route SMS broadcast enqueued successfully', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to broadcast SMS to route';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },
}));
