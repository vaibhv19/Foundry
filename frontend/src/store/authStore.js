import { create } from 'zustand';
import apiClient from '../api/client';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      // Pass both email and username key as email since SimpleJWT serializer might require 'username'
      const response = await apiClient.post('/auth/login/', {
        email,
        username: email,
        password,
      });
      const { token, user } = response.data;

      localStorage.setItem('access_token', token.access);
      localStorage.setItem('refresh_token', token.refresh);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
      return user;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Login failed';
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  register: async (email, name, password) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register/', {
        email,
        name,
        password,
      });
      const { token, user } = response.data;

      localStorage.setItem('access_token', token.access);
      localStorage.setItem('refresh_token', token.refresh);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
      return user;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Registration failed';
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('social');
    localStorage.removeItem('user');
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
