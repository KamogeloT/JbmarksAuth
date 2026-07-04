import { create } from 'zustand';
import { User, AuthState } from '../types';
import { 
  loginWithOAuth,
  loginWithWebhook, 
  logout as apiLogout, 
  getStoredUser, 
  isAuthenticated,
  refreshAccessToken,
} from '../services/api/auth';

interface AuthStore extends AuthState {
  loginWithOAuth: () => Promise<boolean>;
  login: (portalUrl: string, userId: string, token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>; // Refresh Bitrix access token
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  error: null,

  login: async (portalUrl: string, userId: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const result = await loginWithWebhook(portalUrl, userId, token);
      if (result.success && result.user) {
        set({
          isAuthenticated: true,
          user: result.user,
          accessToken: result.accessToken || token,
          loading: false,
          error: null,
        });
        return true;
      } else {
        set({
          isAuthenticated: false,
          error: result.error || 'Login failed',
          loading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        isAuthenticated: false,
        error: error.message || 'Login failed',
        loading: false,
      });
      return false;
    }
  },

  loginWithOAuth: async () => {
    set({ loading: true, error: null });
    try {
      const result = await loginWithOAuth();
      if (result.success && result.user && result.accessToken) {
        set({
          isAuthenticated: true,
          user: result.user,
          accessToken: result.accessToken || null,
          refreshToken: result.refreshToken || null,
          loading: false,
          error: null,
        });
        return true;
      } else {
        set({
          isAuthenticated: false,
          error: result.error || 'OAuth login failed',
          loading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        isAuthenticated: false,
        error: error.message || 'OAuth login failed',
        loading: false,
      });
      return false;
    }
  },

  refreshAccessToken: async () => {
    set({ loading: true });
    try {
      const result = await refreshAccessToken();
      if (result.success && result.accessToken) {
        set({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken || null,
          loading: false,
        });
        return true;
      } else {
        // Refresh failed - user needs to re-authenticate
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
          error: result.error || 'Session expired. Please login again.',
        });
        return false;
      }
    } catch (error: any) {
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: 'Session expired. Please login again.',
      });
      return false;
    }
  },

  logout: async () => {
    set({ loading: true });
    await apiLogout();
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,
    });
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const user = await getStoredUser();
        // Also get tokens to ensure they're in state
        try {
          const { storage } = await import('../services/storage');
          const { Config } = await import('../constants/config');
          const accessToken = await storage.getItem(Config.storage.accessToken);
          const refreshToken = await storage.getItem(Config.storage.refreshToken);
          
          set({
            isAuthenticated: true,
            user,
            accessToken: accessToken,
            refreshToken: refreshToken,
            loading: false,
          });
          return true;
        } catch (storageError) {
          console.error('Error loading tokens from storage:', storageError);
          // Still set authenticated if user exists, tokens might be in memory
          set({
            isAuthenticated: true,
            user,
            accessToken: null,
            refreshToken: null,
            loading: false,
          });
          return true;
        }
      } else {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check authentication',
      });
      return false;
    }
  },

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useAuthStore;
