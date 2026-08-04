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

## 6. Engineering Rationale: Error Policies & Recovery Paths

### 6.1 Resilience to Transient Network Issues (Tenacity)
Because LLM operations rely on external API services, calls are vulnerable to network jitter, rate limiting, and temporary service dropouts.
* **Choice**: Explicit retry decorators (`@retry`) using the `tenacity` library.
* **Behavior**: When the provider encounters transient exceptions (`ResourceExhausted`, `ServiceUnavailable`, `DeadlineExceeded`), it pauses and retries. Using exponential backoff (starting at 2s, scaling to 10s) with 3 maximum attempts handles minor API hiccups transparently without failing the user's debate.

### 6.2 Fail-Safe State Containment
If a background job hits an unrecoverable failure:
* **Catch-All Exception Blocks**: The Celery task executor is wrapped inside a global `try/except` boundary.
* **State Updates**:
  1. The `Blueprint` status is updated to `FAILED`.
  2. The Celery worker updates `Job.status = "FAILURE"` and writes the stack trace to `Job.error_log`.
  3. An `ERROR` WebSocket event is dispatched to notify the frontend.
  This prevents the client UI from hanging indefinitely in a loading state, allowing the user to safely retry or inspect the error.

### 6.3 Transactional Rollback Safety
Restoring prior versions requires mutating multiple tables (marking active section versions, deactivating subsequent decisions, reactivating historical choices).
* **Choice**: Django's `transaction.atomic()` block.
* **Behavior**: If any DB update fails or encounters an exception during rollback, the database is rolled back to its original state. This prevents partial state corruptions where a section might change text without updating its decisions log.

---

## 7. Implementation Notes & Deviations

* **Automatic Provider Retries**: For transient LLM errors (`ResourceExhausted`, `ServiceUnavailable`, `DeadlineExceeded`), the system implements automatic exponential backoff retry loops using the python `tenacity` library. It is configured to stop after 3 attempts, waiting between 2 and 10 seconds between runs.
* **Consistency Error Translation**: Consistency errors are captured by the `run_section_regeneration` Celery task and broadcast over WebSockets under the `ERROR` event channel with `error_code = "DECISION_OVERRIDE_REQUIRED"`. The frontend Zustand store intercepts this event and renders the corresponding conflict warning blocks and manual override triggers in the UI canvas sidebar workspace.


