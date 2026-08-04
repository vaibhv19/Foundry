import { create } from 'zustand';
import apiClient from '../api/client';

export const useBlueprintStore = create((set) => ({
  blueprints: [],
  currentBlueprint: null,
  loading: false,
  error: null,

  fetchBlueprints: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/blueprints/');
      set({ blueprints: response.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createBlueprint: async (raw_text) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/blueprints/', { raw_text });
      set({ loading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchBlueprintDetails: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/blueprints/${id}/`);
      set({ currentBlueprint: response.data, loading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteBlueprint: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/blueprints/${id}/`);
      set((state) => ({
        blueprints: state.blueprints.filter((b) => b.id !== id),
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  renameBlueprint: async (id, title) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.patch(`/blueprints/${id}/rename/`, { title });
      set((state) => ({
        blueprints: state.blueprints.map((b) => (b.id === id ? { ...b, title } : b)),
        currentBlueprint: state.currentBlueprint?.id === id ? response.data : state.currentBlueprint,
        loading: false,
      }));
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  duplicateBlueprint: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/blueprints/${id}/duplicate/`);
      set({ loading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
