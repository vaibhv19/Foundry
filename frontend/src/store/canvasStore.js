import { create } from 'zustand';
import apiClient from '../api/client';

export const useCanvasStore = create((set, get) => ({
  activeSection: null,
  activeVersions: {}, // Map of section ID -> active version object
  sectionVersions: [], // List of versions for the active section
  conflictAlert: null,
  loading: false,
  error: null,

  selectSection: (section) => {
    set({ activeSection: section, sectionVersions: [], error: null });
    if (section) {
      get().fetchSectionVersions(section.id);
    }
  },

  fetchSectionVersions: async (sectionId) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/sections/${sectionId}/versions/`);
      set({ sectionVersions: response.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  restoreVersion: async (versionId) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/versions/${versionId}/restore/`);
      const restoredVersion = response.data;
      const sectionId = restoredVersion.section;

      set((state) => {
        const updatedVersions = state.activeSection?.id === sectionId
          ? state.sectionVersions.map(v => v.id === versionId ? { ...v, is_active: true } : { ...v, is_active: false })
          : state.sectionVersions;

        return {
          activeVersions: {
            ...state.activeVersions,
            [sectionId]: restoredVersion,
          },
          sectionVersions: updatedVersions,
          loading: false,
        };
      });
      return restoredVersion;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  triggerRegen: async (sectionId, userNote = '', enforcePreviousDecisions = true) => {
    set({ loading: true, error: null, conflictAlert: null });
    try {
      const response = await apiClient.post(`/sections/${sectionId}/regenerate/`, {
        user_note: userNote,
        enforce_previous_decisions: enforcePreviousDecisions,
      });
      set({ loading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  handleConflict: (conflict) => {
    set({ conflictAlert: conflict });
  },

  clearConflict: () => {
    set({ conflictAlert: null });
  },

  setActiveVersionForSection: (sectionId, version) => {
    set((state) => ({
      activeVersions: {
        ...state.activeVersions,
        [sectionId]: version,
      },
    }));
  },
}));
