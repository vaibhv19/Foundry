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
