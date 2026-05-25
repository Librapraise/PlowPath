import { create } from 'zustand';
import { api } from '../services/api';
import { useToastStore } from './toastStore';

export interface Customer {
  customer_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'prospect';
  property_type: 'residential' | 'commercial';
  driveway_type: string | null;
  access_notes: string | null;
  notify_sms?: boolean;
  notify_voice?: boolean;
  next_service_decision?: 'confirm' | 'skip' | null;
  // Phase 3.5 Fields
  outstanding_balance?: number;
  payment_status?: 'paid' | 'pending' | 'overdue';
  sign_status?: 'installed' | 'removed' | 'needs_service';
  created_at: string;
  updated_at: string;
}

interface CustomersState {
  customers: Customer[];
  page: number;
  perPage: number;
  total: number;
  search: string;
  statusFilter: string;
  isLoading: boolean;
  error: string | null;

  setFilters: (filters: { search?: string; statusFilter?: string; page?: number }) => void;
  fetchCustomers: () => Promise<void>;
  createCustomer: (customerData: Omit<Customer, 'customer_id' | 'created_at' | 'updated_at' | 'lat' | 'lon'> & { lat?: number; lon?: number }) => Promise<void>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  geocodePreview: (address: string) => Promise<{ lat: number; lon: number; displayName?: string }>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  page: 1,
  perPage: 10,
  total: 0,
  search: '',
  statusFilter: '',
  isLoading: false,
  error: null,

  setFilters: (filters) => {
    set((state) => ({
      ...state,
      search: filters.search !== undefined ? filters.search : state.search,
      statusFilter: filters.statusFilter !== undefined ? filters.statusFilter : state.statusFilter,
      page: filters.page !== undefined ? filters.page : 1, // Default back to 1 if search/status changed
    }));
    get().fetchCustomers();
  },

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { search, statusFilter, page, perPage } = get();
      const params: Record<string, any> = { page, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get<{ data: Customer[]; page: number; per_page: number; total: number }>('/customers', { params });
      set({
        customers: data.data,
        page: data.page,
        perPage: data.per_page,
        total: data.total,
        isLoading: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to load customers';
      set({ error: msg, isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  createCustomer: async (customerData) => {
    set({ isLoading: true });
    try {
      await api.post('/customers', customerData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Customer created successfully', 'success');
      get().fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to create customer';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  updateCustomer: async (id, customerData) => {
    set({ isLoading: true });
    try {
      await api.put(`/customers/${id}`, customerData);
      set({ isLoading: false });
      useToastStore.getState().addToast('Customer updated successfully', 'success');
      get().fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to update customer';
      set({ isLoading: false });
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      useToastStore.getState().addToast('Customer deleted successfully', 'success');
      get().fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to delete customer';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },

  geocodePreview: async (address) => {
    try {
      const { data } = await api.get<{ lat: number; lon: number; displayName?: string }>('/customers/geocode/preview', {
        params: { address },
      });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Geocoding failed. Check the address string.';
      useToastStore.getState().addToast(msg, 'error');
      throw err;
    }
  },
}));
