import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export interface AuthUser {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'owner' | 'manager' | 'driver';
  driver_id: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (s: { token: string; refreshToken: string; user: AuthUser }) => void;
  logout: () => void;
}

const hybridStateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const userStr = await AsyncStorage.getItem(`${name}.user`);
    let token: string | null = null;
    let refreshToken: string | null = null;

    try {
      const credentials = await Keychain.getGenericPassword({ service: 'plowpath.auth' });
      if (credentials) {
        token = credentials.username;
        refreshToken = credentials.password;
      }
    } catch (err) {
      console.error('Failed to retrieve generic password from Keychain', err);
    }

    if (!userStr && !token && !refreshToken) {
      return null;
    }

    return JSON.stringify({
      token,
      refreshToken,
      user: userStr ? JSON.parse(userStr) : null,
    });
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      const { token, refreshToken, user } = parsed;

      if (user) {
        await AsyncStorage.setItem(`${name}.user`, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(`${name}.user`);
      }

      if (token && refreshToken) {
        await Keychain.setGenericPassword(token, refreshToken, { service: 'plowpath.auth' });
      } else {
        await Keychain.resetGenericPassword({ service: 'plowpath.auth' });
      }
    } catch (err) {
      console.error('Failed to parse/set state in hybridStateStorage', err);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(`${name}.user`);
    try {
      await Keychain.resetGenericPassword({ service: 'plowpath.auth' });
    } catch (err) {
      console.error('Failed to reset Keychain', err);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setSession: ({ token, refreshToken, user }) => set({ token, refreshToken, user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    {
      name: 'plowpath.auth',
      storage: createJSONStorage(() => hybridStateStorage),
    },
  ),
);
