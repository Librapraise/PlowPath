import { create } from 'zustand';
import { api } from '../services/api';
import { useToastStore } from './toastStore';

export interface StormEvent {
  storm_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  forecasted_accumulation: number | null;
  actual_accumulation: number | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface StormsState {
  storms: StormEvent[];
  isLoading: boolean;
  error: string | null;

  fetchStorms: () => Promise<void>;
  createStorm: (stormData: Omit<StormEvent, 'storm_id' | 'actual_accumulation' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStorm: (id: string, stormData: Partial<StormEvent>) => Promise<void>;
  deleteStorm: (id: string) => Promise<void>;
}

export const useStormsStore = create<StormsState>((set, get) => ({
  storms: [],
  isLoading: false,
  error: null,

  fetchStorms: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ data: StormEvent[] }>('/storms');
      set({ storms: data.data, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to load storms';
      set({ error: msg, isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  createStorm: async (stormData) => {
    set({ isLoading: true });
    try {
      await api.post('/storms', stormData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Storm event created successfully', 'success');
      get().fetchStorms();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to create storm';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  updateStorm: async (id, stormData) => {
    set({ isLoading: true });
    try {
      await api.put(`/storms/${id}`, stormData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Storm event updated successfully', 'success');
      get().fetchStorms();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to update storm';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  deleteStorm: async (id) => {
    try {
      await api.delete(`/storms/${id}`);
      useToastStore.getState().addToast('Storm event deleted successfully', 'success');
      get().fetchStorms();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to delete storm';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },
}));
