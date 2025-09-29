import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, AuthResponse } from '@/types';
import { authService } from '@/services/auth';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await authService.login(email, password);

          if (response.success && response.data) {
            const { user, organization, token } = response.data;
            set({
              user,
              organization,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            // Set token in localStorage for API calls
            localStorage.setItem('authToken', token);
          } else {
            throw new Error(response.error || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: any) => {
        try {
          set({ isLoading: true });
          const response = await authService.register(data);

          if (response.success && response.data) {
            const { user, organization, token } = response.data;
            set({
              user,
              organization,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            // Set token in localStorage for API calls
            localStorage.setItem('authToken', token);
          } else {
            throw new Error(response.error || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('authToken');
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setAuth: (auth: AuthResponse) => {
        const { user, organization, token } = auth;
        set({
          user,
          organization,
          token,
          isAuthenticated: true,
        });
        localStorage.setItem('authToken', token);
      },

      clearAuth: () => {
        localStorage.removeItem('authToken');
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      refreshProfile: async () => {
        try {
          const response = await authService.getProfile();
          if (response.success && response.data) {
            set(state => ({
              user: { ...state.user, ...response.data },
            }));
          }
        } catch (error) {
          console.error('Failed to refresh profile:', error);
          // If token is invalid, logout
          get().logout();
        }
      },
    }),
    {
      name: 'neurallempire-auth',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);