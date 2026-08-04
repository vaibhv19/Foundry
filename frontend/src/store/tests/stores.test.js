import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

vi.mock('../../api/client', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

let apiClient;
let useAuthStore;
let useStrategyStore;
let useCanvasStore;

describe('Zustand Stores Test Suite', () => {
  beforeAll(async () => {
    const clientModule = await import('../../api/client');
    apiClient = clientModule.default;

    const authModule = await import('../authStore');
    useAuthStore = authModule.useAuthStore;

    const strategyModule = await import('../strategyStore');
    useStrategyStore = strategyModule.useStrategyStore;

    const canvasModule = await import('../canvasStore');
    useCanvasStore = canvasModule.useCanvasStore;
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useStrategyStore.getState().resetStream();
    useCanvasStore.getState().selectSection(null);
    useCanvasStore.getState().clearConflict();
  });

  describe('Auth Store', () => {
    it('should login user and persist tokens in localStorage', async () => {
      const mockResponse = {
        data: {
          token: { access: 'access123', refresh: 'refresh123' },
          user: { id: 1, email: 'test@example.com', name: 'Test User' },
        },
      };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const user = await useAuthStore.getState().login('test@example.com', 'pass123');

      expect(user.email).toBe('test@example.com');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockResponse.data.user);
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'access123');
    });

    it('should clear state on logout', () => {
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });
  });

  describe('Strategy Store', () => {
    it('should append incoming stream tokens correctly', () => {
      useStrategyStore.getState().startStream({ id: 'bp-1' });

      useStrategyStore.getState().appendToken('Tech_Lead', 'Hello ');
      useStrategyStore.getState().appendToken('Tech_Lead', 'World');

      const logs = useStrategyStore.getState().debateLogs;
      expect(logs.length).toBe(1);
      expect(logs[0].sender).toBe('Tech_Lead');
      expect(logs[0].content).toBe('Hello World');
    });
  });

  describe('Canvas Store', () => {
    it('should set active section and version pointers', () => {
      const section = { id: 'sec-1', category: 'TECH_STACK' };
      useCanvasStore.getState().selectSection(section);

      expect(useCanvasStore.getState().activeSection).toEqual(section);
    });

    it('should handle conflict alerts', () => {
      const alert = { message: 'Conflict detected', conflicts: [{ key: 'db', proposed: 'MySQL' }] };
      useCanvasStore.getState().handleConflict(alert);

      expect(useCanvasStore.getState().conflictAlert).toEqual(alert);

      useCanvasStore.getState().clearConflict();
      expect(useCanvasStore.getState().conflictAlert).toBeNull();
    });
  });
});
