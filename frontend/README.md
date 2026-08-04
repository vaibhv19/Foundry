# Foundry — React Frontend Workspace

The frontend of Foundry is built using React 18 with Vite, Zustand for state management, Lucide React for modern iconography, and TailwindCSS for custom styled-component styles.

---

## 1. Directory Structure & App Layout

The frontend workspace contains the following core structures:

```text
frontend/
├── package.json               # Frontend dependency configurations
├── vite.config.js             # Vite development server and builder settings
├── index.html                 # Main single page application index shell
├── src/                       # Source Directory
│   ├── main.jsx               # Entrypoint script mounting React DOM
│   ├── App.jsx                # Core router configurations and theme boundaries
│   ├── index.css              # Custom styling definitions & dark-green theme tokens
│   ├── api/                   # Network Client Integrations
│   │   ├── client.js          # Axios client instance with JWT authorization headers
│   │   └── websocket.js       # WebSocket connection manager with exponential backoff
│   ├── components/            # UI Components
│   │   ├── layout/            # Surround layouts (MissionControlLayout, LeftRail, RightRail, TopBar)
│   │   ├── strategy/          # Strategy debate log screens, streaming text panels
│   │   ├── canvas/            # Document canvas grids, rewrite sidebars, override modals
│   │   └── common/            # Custom styled inputs, buttons, and alert components
│   └── store/                 # Zustand State Stores
│       ├── auth.js            # User registration, login, and credentials states
│       ├── blueprint.js       # Plan detail fetching, duplicating, and renaming states
│       ├── strategy.js        # WebSockets event streaming status & active timeline states
│       └── canvas.js          # Editing modes, version maps, and conflict alerts
```

---

## 2. Global State Management (Zustand)

To optimize performance and isolate component renders, client states are partitioned into decoupled Zustand stores:
* **`useAuthStore`**: Manages auth status, logs users in/out, and caches JWT credentials.
* **`useBlueprintStore`**: Coordinates CRUD APIs mapping directly to blueprint actions.
* **`useStrategyStore`**: Listens to WS payloads, appends incoming stream tokens, and pulses timeline node icons.
* **`useCanvasStore`**: Tracks active version indexes, editor selections, and handles conflict alerts.

---

## 3. Environment Variables Configuration

The frontend Vite compiler configures environment variables via `.env` files in the root of the `frontend/` directory.

Create `frontend/.env` file:
* `VITE_API_URL`: Root path of the backend REST framework (`http://localhost:8000/api/v1`).
* `VITE_WS_URL`: WebSocket endpoint binding path (`ws://localhost:8000/ws/strategy`).

---

## 4. Local Development Startup

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

## 5. WebSockets Connection & Reconnection Manager

Foundry utilizes the custom `WebSocketManager` defined in `src/api/websocket.js` for subscribing client stores to live agent timelines:
* **Token Handshake**: Passes active user access tokens (`?token=JWT_ACCESS_TOKEN`) in the handshake upgrade URL parameters.
* **Reconnection Controller**: Listens to socket disconnect events (`onclose`) and automatically triggers exponential reconnect logic with a max backoff cap of 30 seconds.
* **State Syncing**: Automatically triggers store syncs (`fetchBlueprintDetails`) upon successful reconnection to ensure canvas data is up to date.
