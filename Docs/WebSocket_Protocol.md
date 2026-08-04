# WebSocket Protocol — Foundry

This document defines the real-time transport contract used by Foundry to stream agent progress, node state, and generation output to the frontend. The protocol is intentionally structured so the UI can render a mission-control experience rather than a generic chat feed.

---

## 1. Connection Model

The client connects to a blueprint-scoped WebSocket endpoint:

```text
ws://localhost:8000/ws/strategy/{blueprint_id}/
```

The connection is authenticated with a bearer token or equivalent session token. One connection per blueprint is expected for the lifetime of the generation session.

---

## 2. Message Envelope

Every message follows a common envelope:

```json
{
  "type": "STATUS",
  "payload": {
    "status": "GENERATING",
    "message": "Investor is evaluating market viability"
  }
}
```

The `type` identifies the event, and the `payload` carries the event-specific data.

---

## 3. Event Catalog

| Event | Direction | Purpose |
| :--- | :--- | :--- |
| `JOB_CREATED` | Server → Client | A new generation or regeneration job has been accepted. |
| `NODE_STARTED` | Server → Client | A graph node has begun execution. |
| `NODE_COMPLETED` | Server → Client | A node completed successfully. |
| `NODE_FAILED` | Server → Client | A node failed and may require recovery. |
| `TOKEN` | Server → Client | A stream chunk from the current node. |
| `STATUS` | Server → Client | A human-readable lifecycle or progress update. |
| `HEARTBEAT` | Server → Client | Keeps the connection alive. |
| `DEBUG` | Server → Client | Optional diagnostics for development builds. |
| `COMPLETE` | Server → Client | The run completed. |
| `ERROR` | Server → Client | A terminal or recoverable error. |

---

## 4. Payload Schemas

### 4.1 `JOB_CREATED`
```json
{
  "blueprint_id": "UUID",
  "job_id": "UUID"
}
```

### 4.2 `NODE_STARTED`
```json
{
  "node": "Investor",
  "iteration": 1
}
```

### 4.3 `NODE_COMPLETED`
```json
{
  "node": "Tech_Lead",
  "iteration": 2
}
```

### 4.4 `TOKEN`
```json
{
  "node": "Investor",
  "content": "This product is viable if...",
  "is_final": false
}
```

### 4.5 `STATUS`
```json
{
  "status": "GENERATING",
  "message": "The PM is revising scope based on investor pressure"
}
```

### 4.6 `ERROR`
```json
{
  "code": "LLM_TIMEOUT",
  "message": "The Tech Lead timed out while evaluating the stack"
}
```

---

## 5. Client Commands

The client can send lightweight control messages over the same connection:

- `resume_generation`: continue a previously interrupted run
- `cancel_generation`: stop the active run
- `request_state`: request a fresh state snapshot from the backend

---

## 6. Reconnection Behavior

If the connection drops, the runtime should continue the generation job in the background.

When the client reconnects:
- the UI requests the latest state snapshot
- the backend returns the current blueprint status and latest sections
- the UI can render the latest completed output without replaying the full stream

---

## 7. Related Documents

- [API_Specification.md](API_Specification.md)
- [Agent_Runtime.md](Agent_Runtime.md)
- [Error_Handling.md](Error_Handling.md)

---

## 8. Implementation Notes & Deviations

* **Channels Payload Envelope Nesting**: In the final implementation, ASGI group broadcast messages are dispatched with data nested within a `payload` dictionary attribute. The frontend client-side `websocket.js` parser maps payloads using `data.payload` (e.g. `data.payload.message`, `data.payload.token`, `data.payload.node`, etc.).
* **Reconnection Manager**: The client-side WebSocket manager (`frontend/src/api/websocket.js`) handles transient disconnects using an automatic exponential backoff retry mechanism (starting at 1s, doubling on failure, capped at 30s). Upon a successful reconnect, it automatically fires `fetchBlueprintDetails` to retrieve the latest blueprint and section snapshot.

