import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setSession: ({ token, refreshToken, user }) => set({ token, refreshToken, user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'plowpath.auth' },
  ),
);
