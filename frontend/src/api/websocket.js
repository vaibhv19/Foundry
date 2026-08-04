import { useStrategyStore } from '../store/strategyStore';
import { useBlueprintStore } from '../store/blueprintStore';
import { useCanvasStore } from '../store/canvasStore';

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.blueprintId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.isReconnecting = false;
  }

  connect(blueprintId) {
    if (this.socket) {
      this.disconnect();
    }

    this.blueprintId = blueprintId;
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8000/ws/strategy/${blueprintId}/?token=${token}`;

    useStrategyStore.getState().startStream({ id: blueprintId });

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;

      if (this.isReconnecting) {
        useBlueprintStore.getState().fetchBlueprintDetails(blueprintId);
        this.isReconnecting = false;
        useStrategyStore.getState().updateStatusMessage('Reconnected to strategy room. Syncing state...');
      } else {
        useStrategyStore.getState().updateStatusMessage('Connected to strategy room.');
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        switch (type) {
          case 'STATUS':
            useStrategyStore.getState().updateStatusMessage(data.message);
            if (data.node) {
              useStrategyStore.getState().updateNodeState(data.node, 'thinking');
            }
            break;

          case 'STREAM':
            if (data.node && data.text) {
              useStrategyStore.getState().appendToken(data.node, data.text);
              useStrategyStore.getState().updateNodeState(data.node, 'thinking');
            }
            break;

          case 'COMPLETE':
            useStrategyStore.getState().setComplete(data.message);
            useBlueprintStore.getState().fetchBlueprintDetails(blueprintId);
            const currentNodes = useStrategyStore.getState().nodesStatus;
            Object.keys(currentNodes).forEach((node) => {
              useStrategyStore.getState().updateNodeState(node, 'idle');
            });
            break;

          case 'ERROR':
            if (data.error_code === 'DECISION_OVERRIDE_REQUIRED') {
              useCanvasStore.getState().handleConflict({
                message: data.message,
                conflicts: data.conflicts || []
              });
            }
            useStrategyStore.getState().setError(data.message);
            break;

          default:
            console.log('Unknown socket event type:', type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.reason);
      useStrategyStore.getState().updateStatusMessage('Connection lost. Reconnecting...');

      this.isReconnecting = true;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
      this.reconnectAttempts++;

      this.reconnectTimer = setTimeout(() => {
        console.log(`Attempting reconnect... (Attempt ${this.reconnectAttempts})`);
        this.connect(blueprintId);
      }, delay);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    this.blueprintId = null;
    this.isReconnecting = false;
    useStrategyStore.getState().resetStream();
  }
}

const socketManager = new WebSocketManager();
export default socketManager;
