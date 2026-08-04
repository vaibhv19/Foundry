# Zustand State Management & Client Scaffolding

This document details the configuration, design patterns, and protocols for the React frontend client architecture implemented in Phase 09.

## 1. Zustand Store Architecture

To maintain performance and keep component renders focused, the application's global client state is partitioned into four distinct Zustand stores:

-   **`authStore`**: Manages user session state, local credentials storage (`access_token`, `refresh_token`, and `user` payload), and REST auth flows (`/users/login/` and `/users/register/`).
-   **`blueprintStore`**: Coordinates REST CRUD operations (list, create, detail, delete, rename, duplicate) mapping directly to backend viewsets.
-   **`strategyStore`**: Handles real-time streaming states. It receives incoming debate socket packets to append incremental output chunks and transition individual agent node statuses.
-   **`canvasStore`**: Directs interactive section canvas states, active selected version ID arrays, and conflict alert warning triggers.

---

## 2. Authenticated REST Axios Interceptors

The Custom Axios client wrapper (`src/api/client.js`) automates Authorization header injection and token cleanup:

```text
       [React Component / Store Request]
                       │
                       ▼
            +────────────────────+
            |    Axios Client    |
            +──────────┬─────────+
                       │
             Access Token exists?
            /                    \
          YES                     NO
          /                         \
[Inject Header: Bearer]       [Send Request]
[   access_token      ]              │
          │                          │
          ▼                          ▼
   [Server Response]          [Server Response]
          │                          │
   Token Expired? (401/403)          │
  /                       \          │
YES                        NO        │
 /                           \       │
[Clear Local Storage &]   [Return  ] │
[Deauthenticate Session]  [Response] │
                                     ▼
```

---

## 3. Auto-Reconnecting WebSocket Client

The custom `WebSocketManager` in `src/api/websocket.js` coordinates real-time stream subscription lifecycles:

```text
 [WebSocket Closed] ──► [Backoff Delay: 1s, 2s, 5s...] ──► [Attempt Reconnect]
                                                                    │
                                                                 Success?
                                                                /        \
                                                              YES         NO
                                                              /             \
                                                    [Fetch Snapshots via]  [Increment]
                                                    [ REST API to Sync  ]  [Attempts ]
```

-   Upon reconnection, `WebSocketManager` calls `fetchBlueprintDetails` to retrieve a full REST snapshot. This prevents state drift if debate stream frames were missed while disconnected.

---

## 4. Engineering Lessons & Troubleshooting Stories

### 4.1 UI Input Lag & Zustand Selector Re-render Loops
* **Problem**: When typing in the rewrite sidebar or toggling section versions on the Canvas, the input fields suffered from severe lag and visual delays.
* **Why it happened**: Components were subscribing to the entire Zustand store: `const store = useCanvasStore()`. Because the store contains multiple active attributes (like `activeVersions`, `conflicts`, and `isSaving`), any minor state update (such as updating character counts in a sidebar input) triggered a full re-render of every canvas card, blocking the main thread.
* **Solution**: We implemented granular state selectors. Components now subscribe only to the specific attributes they render:
  ```javascript
  const activeVersion = useCanvasStore(state => state.activeVersions[sectionId]);
  const setVersion = useCanvasStore(state => state.setActiveVersion);
  ```
  This isolates renders, allowing characters to be typed at 60 FPS while keeping the canvas blocks decoupled.

### 4.2 Handling Expired Token Refresh Races
* **Problem**: In multi-user setups, when multiple parallel REST requests hit the server after the 5-minute access token expired, they all failed with `401 Unauthorized` at the same time. The Axios interceptor caught these, fired multiple concurrent refresh requests, and caused the first refresh to succeed and invalidate the refresh token, causing subsequent concurrent refresh calls to fail and log the user out.
* **Solution**: In our portfolio-scoped environment, we handled this gracefully. If a request returns `401`, we clear the local store credentials and trigger a clean redirect to the login page (`/login`), logging the session out. This avoids complex refresh queuing architectures while maintaining clean security boundaries.

