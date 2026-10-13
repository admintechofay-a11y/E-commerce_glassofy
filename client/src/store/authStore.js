import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (_err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/login', credentials);
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true };
      }
      throw new Error(typeof res.message === 'string' ? res.message : 'Login failed');
    } catch (err) {
      const message =
        typeof err.message === 'string'
          ? err.message
          : typeof err.error === 'string'
            ? err.error
            : 'Invalid email or password';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/register', userData);
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true };
      }
      throw new Error(typeof res.message === 'string' ? res.message : 'Registration failed');
    } catch (err) {
      let message = 'Registration failed. Please check your details.';
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        const first = err.errors[0];
        message = typeof first === 'string' ? first : first?.message || message;
      } else if (typeof err.message === 'string') {
        message = err.message;
      } else if (typeof err.error === 'string') {
        message = err.error;
      }
      set({ error: message, isLoading: false });
      return { success: false, error: message, errors: err.errors };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  updateProfile: async (profileData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.put('/auth/profile', profileData);
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isLoading: false,
          error: null,
        });
        return { success: true, user: res.data.user };
      }
      throw new Error(res.message || 'Profile update failed');
    } catch (err) {
      const message = err.message || 'Profile update failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },
}));
