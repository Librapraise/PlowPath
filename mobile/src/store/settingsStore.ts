import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export interface DriverSettings {
  theme: 'light' | 'dark';
  navigation_app: 'google_maps' | 'apple_maps' | 'waze';
  tracking_accuracy: 'high' | 'power_saver';
  upload_frequency_seconds: number;
}

interface SettingsState {
  settings: DriverSettings;
  loading: boolean;
  error: string | null;
  setLocalSettings: (settings: Partial<DriverSettings>) => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<DriverSettings>) => Promise<void>;
}

const defaultSettings: DriverSettings = {
  theme: 'light',
  navigation_app: 'google_maps',
  tracking_accuracy: 'high',
  upload_frequency_seconds: 30,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      loading: false,
      error: null,
      setLocalSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      fetchSettings: async () => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.get<DriverSettings>('/drivers/me/settings');
          set({ settings: { ...defaultSettings, ...data }, loading: false });
        } catch (err: any) {
          console.warn('[SETTINGSSTORE] Failed to fetch settings from backend:', err?.message || err);
          // Don't overwrite local storage on failure (e.g. offline)
          set({ loading: false });
        }
      },
      updateSettings: async (newSettings) => {
        set({ loading: true, error: null });
        const merged = { ...get().settings, ...newSettings };
        // Optimistically update local state
        set({ settings: merged });
        try {
          await api.put('/drivers/me/settings', merged);
          set({ loading: false });
        } catch (err: any) {
          console.warn('[SETTINGSSTORE] Failed to sync settings to backend:', err?.message || err);
          set({ error: 'Saved locally, but failed to sync online.', loading: false });
        }
      },
    }),
    {
      name: 'plowpath.driverSettings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
