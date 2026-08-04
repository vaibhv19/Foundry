import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

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

vi.mock('../../store/blueprintStore', () => {
  const mockStore = {
    blueprints: [
      { id: 'bp-1', title: 'Blueprint One', status: 'READY', created_at: '2026-08-04T00:00:00Z', is_deleted: false, idea: { raw_text: 'Coffee startup' } },
      { id: 'bp-2', title: 'Blueprint Two', status: 'GENERATING', created_at: '2026-08-04T00:00:00Z', is_deleted: false, idea: { raw_text: 'AI startup' } },
    ],
    fetchBlueprints: vi.fn(),
    createBlueprint: vi.fn(),
    deleteBlueprint: vi.fn(),
    loading: false,
  };
  return {
    useBlueprintStore: (selector) => selector ? selector(mockStore) : mockStore,
  };
});

vi.mock('../../store/authStore', () => {
  const mockStore = {
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
  };
  return {
    useAuthStore: (selector) => selector ? selector(mockStore) : mockStore,
  };
});

vi.mock('../../store/strategyStore', () => {
  const mockStore = {
    debateLogs: [
      { sender: 'Investor', content: 'We need high margins.', timestamp: '2026-08-04T12:00:00Z' },
      { sender: 'Tech_Lead', content: 'PostgreSQL is fine.', timestamp: '2026-08-04T12:01:00Z' },
    ],
    isStreaming: false,
    nodesStatus: {},
  };
  return {
    useStrategyStore: (selector) => selector ? selector(mockStore) : mockStore,
  };
});

vi.mock('../../store/canvasStore', () => {
  const mockStore = {
    activeSection: null,
    selectSection: vi.fn(),
    restoreVersion: vi.fn(),
    activeVersions: {},
    setActiveVersionForSection: vi.fn(),
  };
  return {
    useCanvasStore: (selector) => selector ? selector(mockStore) : mockStore,
  };
});

import Dashboard from '../../pages/Dashboard';
import StreamingPane from '../strategy/StreamingPane';

describe('Frontend Components Test Suite', () => {
  it('Dashboard renders user blueprints correctly', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Blueprint One')).toBeDefined();
    expect(screen.getByText('Blueprint Two')).toBeDefined();
    expect(screen.getByText('Coffee startup')).toBeDefined();
  });

  it('StreamingPane renders live debate logs correctly', () => {
    render(<StreamingPane />);

    expect(screen.getByText('We need high margins.')).toBeDefined();
    expect(screen.getByText('PostgreSQL is fine.')).toBeDefined();
  });
});
