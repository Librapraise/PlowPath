import { create } from 'zustand';
import { api } from '../services/api';
import { useToastStore } from './toastStore';

export interface Driver {
  driver_id: string;
  user_id: string;
  name: string;
  phone: string;
  hourly_rate: number | null;
  vehicle_type: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface DriversState {
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;

  fetchDrivers: () => Promise<void>;
  createDriver: (driverData: Omit<Driver, 'driver_id' | 'user_id' | 'status' | 'created_at' | 'updated_at'> & { password: string }) => Promise<void>;
  updateDriver: (id: string, driverData: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
}

export const useDriversStore = create<DriversState>((set, get) => ({
  drivers: [],
  isLoading: false,
  error: null,

  fetchDrivers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ data: Driver[] }>('/drivers');
      set({ drivers: data.data, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to load drivers';
      set({ error: msg, isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  createDriver: async (driverData) => {
    set({ isLoading: true });
    try {
      await api.post('/drivers', driverData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Driver created successfully', 'success');
      get().fetchDrivers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to create driver';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  updateDriver: async (id, driverData) => {
    set({ isLoading: true });
    try {
      await api.put(`/drivers/${id}`, driverData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Driver updated successfully', 'success');
      get().fetchDrivers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to update driver';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  deleteDriver: async (id) => {
    try {
      await api.delete(`/drivers/${id}`);
      useToastStore.getState().addToast('Driver deactivated successfully', 'success');
      get().fetchDrivers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to deactivate driver';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },
}));
