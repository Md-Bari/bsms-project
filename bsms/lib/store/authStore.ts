import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { apiRequest } from '@/lib/api/client';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  initialize: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; phone?: string; emailNotifications?: boolean }) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      initialize: async () => {
        const { token, user } = useAuthStore.getState();
        if (!token || user) return;

        set({ isLoading: true });

        try {
          const response = await apiRequest<{ user: User }>('/me', { token });
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (data) => {
        const { token } = useAuthStore.getState();
        if (!token) {
          return { success: false, error: 'Not authenticated' };
        }

        set({ isLoading: true });

        try {
          const response = await apiRequest<{ user: User }>('/me', {
            method: 'PATCH',
            body: data,
            token,
          });

          set({ user: response.user, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error instanceof Error ? error.message : 'Profile update failed' };
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest<{ token: string; user: User }>('/login', {
            method: 'POST',
            body: { email, password },
          });
          set({ user: response.user, token: response.token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error instanceof Error ? error.message : 'Invalid email or password' };
        }
      },

      logout: () => {
        const { token } = useAuthStore.getState();
        if (token) {
          void apiRequest('/logout', { method: 'POST', token }).catch(() => undefined);
        }
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'bsms-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
