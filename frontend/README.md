# Foundry — React Frontend Workspace

The frontend of Foundry is built using React 18 with Vite, Zustand for state management, Lucide React for modern iconography, and TailwindCSS for custom styled-component styles.

---

## Workspace Structure

* **src/api/**: API client configurations (Axios) and WebSocket manager controllers with automated exponential backoff reconnection logics.
* **src/components/canvas/**: Interactive document editor blocks, layout grids, rewrite sidebars, decision anchors, and manual override popovers.
* **src/components/strategy/**: Strategy room streaming debate consoles, agent timeline pulses, and activity logs.
* **src/components/layout/**: surrounding grids layout components (`LeftRail`, `RightRail`, `TopBar`, `MissionControlLayout`).
* **src/store/**: Centralized Zustand stores managing authentication scopes, canvas editing states, and streaming logs.

---

## Environment Variables Configuration

The frontend Vite compiler configures environment variables via `.env` files in the root of the `frontend/` directory.

Create `frontend/.env` file:
* `VITE_API_URL`: Root path of the backend REST framework (`http://localhost:8000/api/v1`).
* `VITE_WS_URL`: WebSocket endpoint binding path (`ws://localhost:8000/ws/strategy`).

---

## Local Development Startup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Launch Dev Web Server**:
   ```bash
   npm run dev
   ```
   *(Opens access to local client web viewer at [http://localhost:5173](http://localhost:5173)).*

3. **Verify Dev Build**:
   To compile and verify production static bundles locally:
   ```bash
   npm run build
   ```

---

## WebSocket Connection Management

Foundry utilizes the custom `WebSocketManager` defined in `src/api/websocket.js` for subscribing client stores to live agent timelines:
* **Token Handshake**: Passes active user access tokens (`?token=JWT_ACCESS_TOKEN`) in the handshake URL parameters.
* **Reconnection Controller**: Listens to socket disconnect events (`onclose`) and automatically triggers exponential reconnect logic with a max backoff cap of 30 seconds.
* **State Syncing**: Automatically triggers store syncs (`fetchBlueprintDetails`) upon successful reconnection to ensure canvas data is up to date.
