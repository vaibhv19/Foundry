# Error Handling — Foundry

Foundry needs a clear error model because the runtime combines asynchronous generation, stateful debate orchestration, and user edits. Errors must be visible, recoverable, and traceable without breaking the user's workflow.

---

## 1. Error Categories

### 1.1 Provider Errors
These occur when the LLM provider fails or times out.

Examples:
- `LLM_TIMEOUT`
- `RATE_LIMITED`
- `INVALID_RESPONSE`
- `SERVICE_UNAVAILABLE`

### 1.2 Graph Errors
These occur when a node fails or the debate cannot progress.

Examples:
- `NODE_FAILED`
- `CONFLICT_LOOP`
- `MAX_ITERATIONS_REACHED`

### 1.3 Consistency Errors
These occur when a regeneration request violates an active decision.

Examples:
- `CONSISTENCY_VIOLATION`
- `DECISION_OVERRIDE_REQUIRED`

### 1.4 Persistence Errors
These occur when the runtime cannot save the state or create a new version.

Examples:
- `DB_WRITE_FAILED`
- `VERSION_CREATE_FAILED`

### 1.5 User Action Errors
These occur when the user requests an action that is not valid for the current blueprint state.

Examples:
- `INVALID_TRANSITION`
- `BLUEPRINT_DELETED`
- `ACTION_CONFLICT`

---

## 2. Error Handling Policy

The runtime should:
- classify the error immediately
- publish a structured event to the UI
- persist the event in the runtime logs
- preserve partial state when possible
- offer a recovery action where appropriate

The UI should not show a generic failure for every case; it should explain whether the user can retry, resume, or override.

---

## 3. Retry and Recovery

For transient provider failures, the runtime should retry with backoff.

The retry policy should be:
- short retries for timeouts and temporary service issues
- no retry for hard consistency violations unless the user explicitly overrides the decision
- no automatic retry for invalid transitions or deleted blueprints

If the runtime can continue after a partial failure, it should move to `PARTIALLY_GENERATED` rather than failing the entire blueprint.

---

## 4. User-Facing Recovery Paths

The UI should support:
- **Retry** for failed generation runs
- **Resume** for interrupted debates
- **Override** when consistency conflicts require a manual decision
- **Rollback** when a version introduces unwanted changes

These paths preserve the user's trust in the system while keeping the architecture lightweight for a portfolio project.

---

## 5. Related Documents

- [Design.md](Design.md)
- [Agent_Runtime.md](Agent_Runtime.md)
- [WebSocket_Protocol.md](WebSocket_Protocol.md)
