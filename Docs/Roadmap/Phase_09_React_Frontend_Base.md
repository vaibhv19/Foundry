# Phase 09 — React Frontend: Architecture & Core State

## Phase Goal
The objective of this phase is to construct the React application base architecture and state management layers. We will configure the global styling system using CSS Variables for theme tokens, establish routing parameters, build authenticated REST clients, implement custom WebSocket connections with automatic reconnect catch-up logic, and structure unified Zustand stores to handle authentication, blueprint lists, real-time streaming, and canvas editing states.

## Why This Phase Comes Now
The React application configuration, base routing, and global Zustand state/WebSocket client layers must be established before we build the interactive visual components that rely on them.

---

## Folder Structure

```text
frontend/
├── package.json               # Added zustand, axios, react-router-dom, lucide-react
└── src/
    ├── main.jsx
    ├── index.css              # Global styling and Design Variables
    ├── App.jsx                # Router config
    ├── components/
    │   └── common/            # Guard components
    │       └── ProtectedRoute.jsx
    ├── api/
    │   ├── client.js          # Axios configuration and JWT interceptor
    │   └── websocket.js       # WebSocket manager wrapper
    └── store/                 # Zustand Stores
        ├── authStore.js
        ├── blueprintStore.js
        ├── strategyStore.js
        └── canvasStore.js
```

---

## Module Definitions

### 1. CSS Design Token Styling System
* **Purpose**: Provides visual aesthetics matching "The Industrial Forge" design option.
* **Responsibilities**: Defining colors, dark modes, typography, spacing, border styles, and pulse animations.
* **Dependencies**: None.
* **Outputs**: Global CSS tokens available in all React files.

### 2. Zustand Global State Stores
* **Purpose**: Unified frontend store to hold the application's reactive client-side state.
* **Responsibilities**:
  - `authStore`: User state, login, register, token injection.
  - `blueprintStore`: Fetching lists, creating blueprints, metadata, renaming, duplicating, and deleting.
  - `strategyStore`: Handling real-time debate streams, message buffers, token accretion, and convergence meter updates.
  - `canvasStore`: Selected section text, sidebar rewrite targets, version listings, and conflict states.
* **Dependencies**: `zustand`, Axios REST Client.

### 3. Authenticated REST API Client
* **Purpose**: Coordinates standard CRUD API requests.
* **Responsibilities**: Automatically reading active tokens from auth state, injecting them as Bearer Headers, catching HTTP 401/403 exceptions, and mapping JSON payloads.
* **Dependencies**: `axios`.
* **Inputs**: Path targets, payload DTOs.
* **Outputs**: Resolved JSON objects or normalized error codes.

### 4. Custom WebSocket Connection Client
* **Purpose**: Maintains real-time debate communication channel.
* **Responsibilities**: Opening connections with auth credentials, receiving server messages, routing them to the `strategyStore`, emitting heartbeats, and re-fetching full state snapshots upon recovery.
* **Dependencies**: Native browser WebSockets, `blueprintStore`.
* **Inputs**: Socket events.
* **Outputs**: Dispatches payload structures to client store actions.

---

## Design Tokens Configuration (`index.css` outline)
```css
:root {
  --base-bg: #0F172A;        /* Slate 900 */
  --base-text: #F8FAFC;      /* Slate 50 */
  --accent-spark: #F97316;   /* Orange 500 */
  --accent-blueprint: #06B6D4; /* Cyan 500 */
  
  /* Agent Color Identifiers */
  --color-investor: #F59E0B; /* Gold */
  --color-pm: #6366F1;       /* Indigo */
  --color-tech: #10B981;     /* Emerald */
  
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## Atomic Implementation Tasks

### Task 9.1: Add Packages to package.json
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 1.4
* **Description**: Add `zustand`, `axios`, `react-router-dom`, and `lucide-react` to `frontend/package.json` and run installations.
* **Definition of Done**: Dependencies are present in `node_modules`.

### Task 9.2: Create Global CSS Styling Sheet
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 9.1
* **Description**: Create `frontend/src/index.css`. Declare root CSS variables, typography maps, layout styles, and animations:
  - `.thinking-pulse`: Glow indicator.
  - `.mono-text`: Code-editor layout styles.
* **Definition of Done**: Styles compile and are loaded in `main.jsx`.

### Task 9.3: Build Axios API client wrapper
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 9.1
* **Description**: Create `frontend/src/api/client.js`. Define base Axios instance target `http://localhost:8000/api/v1`. Add interceptors to check for authentication tokens in localStorage and insert `Authorization: Bearer <token>` headers.
* **Definition of Done**: Axios wrapper intercepts and adds token tags to outbox payloads.

### Task 9.4: Implement Auth Store and Route Guards
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 9.3
* **Description**: Create `src/store/authStore.js` to manage login/register status and persist credentials in localStorage. Write `src/components/common/ProtectedRoute.jsx` that redirects unauthenticated users to `/login`.
* **Definition of Done**: Unauthorized attempts to access private paths are redirected.

### Task 9.5: Implement Blueprint Store
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 9.4
* **Description**: Create `src/store/blueprintStore.js` containing API endpoints matching backend routes: list, create, detail, delete, rename, duplicate.
* **Definition of Done**: Store actions perform REST calls and mutate lists state correctly.

### Task 9.6: Develop Strategy Room WebSocket Store
* **Size**: S
* **Risk**: High
* **Prerequisites**: Task 9.5
* **Description**: Create `src/store/strategyStore.js`. Manages:
  - `activeJob`: Active generation task details.
  - `nodesStatus`: State of each node (idle, thinking, wait, done).
  - `debateLogs`: Cumulative stream transcript array.
  - `convergenceProgress`: Integer (0-100).
  - Action methods: `startStream`, `appendToken`, `updateNodeState`, `setComplete`.
* **Definition of Done**: Store exposes clear methods to update state from socket events.

### Task 9.7: Develop Canvas Block and Version Store
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 9.5
* **Description**: Create `src/store/canvasStore.js`. Track:
  - `activeSection`: Selected section details.
  - `activeVersions`: Dictionary of active version IDs per section.
  - `conflictAlert`: Conflict detail warning object.
  - Action methods: `selectSection`, `restoreVersion`, `triggerRegen`, `handleConflict`.
* **Definition of Done**: Store contains actions to update active version and handle overrides.

### Task 9.8: Implement WebSocket Manager Client
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 9.6
* **Description**: Write `src/api/websocket.js`. Handles browser WebSocket lifecycle:
  - Endpoint: `ws://localhost:8000/ws/strategy/{blueprint_id}/?token=<token>`.
  - Maps socket events to `strategyStore` actions.
  - Implement reconnect loop. Upon reconnection, fetch the latest blueprint detail via REST API to catch up.
* **Definition of Done**: Socket reconnects automatically and calls refresh state.

### Task 9.9: Write Store Unit Tests
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 9.8
* **Description**: Write unit tests using Vitest (or standard Jest) to assert:
  - Auth store updates tokens.
  - Strategy store appends incoming stream tokens.
  - Canvas store sets correct version pointers.
* **Definition of Done**: Store state mutations execute successfully.

---

## Milestone Verification Checkpoint (Milestone 05-A)
* **Status**: Running suite.
* **Behavior**: UI setup ready. State stores, REST connections, and WebSocket client functions compile.
* **Incomplete Features**: Strategy Room dashboard components, Interactive Canvas blocks.

---

## Developer Validation Checklist
- [ ] React frontend scaffolding builds successfully via Vite developer tools.
- [ ] Visual style variables and global typography classes load without CSS errors.
- [ ] Axios client successfully intercepts request headers and appends active JWT tokens.
- [ ] Zustand authentication store registers and retains user sessions.
- [ ] Blueprint store triggers REST calls and updates local lists state.
- [ ] Strategy store updates state properties correctly from mock WebSocket frame packages.
- [ ] Canvas store select and version restore actions mutate active pointers correctly.
- [ ] WebSocket client manager establishes socket connection and executes automatic reconnect logic.
- [ ] Vitest unit tests pass all Zustand store state mutation assertions.

---

## Git Workflow

```text
Feature Branch
      ↓
   Develop
      ↓
   Testing
      ↓
    Main
```

* **Suggested Branch Name**: `feat/frontend/client-scaffold`
* **Suggested Merge Point**: `develop`
* **Suggested Tag**: `v1.0.0-phase09`
* **Suggested Commit Grouping**:
  - `feat/frontend/dependencies`: Install frontend libraries
  - `feat/frontend/css-variables`: Visual variables & keyframe animations
  - `feat/frontend/rest-client`: Axios custom configuration
  - `feat/frontend/auth-routing`: Session stores and navigation routing
  - `feat/frontend/blueprint-store`: Blueprint listing CRUD store actions
  - `feat/frontend/strategy-store`: Real-time streaming store
  - `feat/frontend/canvas-store`: Interactive canvas version control state stores
  - `feat/frontend/websocket-client`: Auto-reconnect WebSocket socket manager
  - `test/frontend/stores`: Unit tests for Zustand store actions

---

## Suggested GitHub Issues
* **Issue #5.1**: Scaffold React (Vite) app, install Tailwind CSS, and configure layout shells.
* **Issue #5.2**: Create Zustand stores for auth, streaming debate, and canvas editing.

---

## Learning Document
* **[09_Zustand_State_Management.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Learning/09_Zustand_State_Management.md)**: Detail Zustand store structures, persistent store syncs, and WebSocket payload processing. After completing this phase, document the Zustand state store partitions, query interceptor settings, and socket client reconnect loops.
