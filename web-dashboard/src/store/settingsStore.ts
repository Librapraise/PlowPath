import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'fr-QC' | 'en-CA' | 'en-US' | 'en-GB';

interface SettingsState {
  language: Locale;
  setLanguage: (lang: Locale) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'fr-QC',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'plowpath.dashboardSettings',
    }
  )
);
