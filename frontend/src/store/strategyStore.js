import { create } from 'zustand';

export const useStrategyStore = create((set) => ({
  activeJob: null,
  nodesStatus: {
    Investor: 'idle',
    Product_Manager: 'idle',
    Tech_Lead: 'idle',
    Consistency_Check: 'idle',
    Tie_Breaker: 'idle',
  },
  debateLogs: [],
  convergenceProgress: 0,
  isStreaming: false,
  error: null,

  startStream: (job) => {
    set({
      activeJob: job,
      nodesStatus: {
        Investor: 'idle',
        Product_Manager: 'idle',
        Tech_Lead: 'idle',
        Consistency_Check: 'idle',
        Tie_Breaker: 'idle',
      },
      debateLogs: [],
      convergenceProgress: 0,
      isStreaming: true,
      error: null,
    });
  },

  updateNodeState: (node, status) => {
    set((state) => ({
      nodesStatus: {
        ...state.nodesStatus,
        [node]: status,
      },
    }));
  },

  appendToken: (node, token) => {
    set((state) => {
      const logs = [...state.debateLogs];
      const lastLog = logs[logs.length - 1];

      if (lastLog && lastLog.sender === node) {
        lastLog.content += token;
      } else {
        logs.push({
          sender: node,
          content: token,
          timestamp: new Date().toISOString(),
        });
      }

      const currentProgress = state.convergenceProgress;
      const nextProgress = Math.min(currentProgress + 1, 95);

      return {
        debateLogs: logs,
        convergenceProgress: nextProgress,
      };
    });
  },

  updateStatusMessage: (message) => {
    set((state) => ({
      debateLogs: [
        ...state.debateLogs,
        {
          sender: 'System',
          content: message,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  setComplete: (message = 'Debate completed successfully.') => {
    set((state) => ({
      isStreaming: false,
      convergenceProgress: 100,
      debateLogs: [
        ...state.debateLogs,
        {
          sender: 'System',
          content: message,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  setError: (errorMessage) => {
    set((state) => ({
      isStreaming: false,
      error: errorMessage,
      debateLogs: [
        ...state.debateLogs,
        {
          sender: 'Error',
          content: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  resetStream: () => {
    set({
      activeJob: null,
      nodesStatus: {
        Investor: 'idle',
        Product_Manager: 'idle',
        Tech_Lead: 'idle',
        Consistency_Check: 'idle',
        Tie_Breaker: 'idle',
      },
      debateLogs: [],
      convergenceProgress: 0,
      isStreaming: false,
      error: null,
    });
  },
}));
