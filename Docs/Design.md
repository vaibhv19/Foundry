# DESIGN.md — Foundry System Architecture

This document defines the technical architecture of **Foundry**. It details how the system orchestrates multi-agent state machines, manages asynchronous execution, and implements the **Decision Memory Engine** to ensure structural integrity across blueprint versions.

---

## 1. Component Overview

Foundry is built as a distributed asynchronous system, separating the high-latency AI orchestration from the low-latency web interface.

*   **Django API (Web Layer):** A DRF-based REST API that manages users, blueprint metadata, and section versioning. It acts as the gateway for triggering long-running agent tasks.
*   **Celery Workers (Agent Runtime):** The execution environment for the LangGraph state graph. These workers run the autonomous multi-agent debate off the request thread.
*   **Django Channels (Streaming Layer):** An ASGI-based WebSocket layer that streams real-time LLM tokens and blueprint lifecycle updates to the frontend.
*   **Redis (Orchestration Backbone):** Serves two critical roles:
    1.  **Broker:** Handles message passing between Django and Celery.
    2.  **Channel Layer:** Backs the bi-directional WebSocket communication for live streaming.
*   **PostgreSQL (Persistence Layer):** The source of truth for the `Blueprint` relational model, `Section` versions, and the structured `DecisionLog` entries.
*   **LLMService / GeminiProvider:** The application-facing abstraction for model calls, with `GeminiProvider` implemented for v1 and future providers added through the same interface.
*   **LangGraph Agent Process:** A state-machine-based orchestration layer that manages the "Strategy Room" debate, ensuring agents follow a defined turn-order and shared state.

---

## 2. Request Lifecycles

### 2.1 Initial Blueprint Generation
1.  **Trigger:** React sends a startup idea to the API. Django creates a `Blueprint` record with lifecycle state `QUEUED`.
2.  **Dispatch:** Django pushes a task to Celery and returns a `202 Accepted` response.
3.  **Connection:** React establishes a WebSocket connection using the returned `blueprint_id`.
4.  **Execution:** The Celery worker initializes the LangGraph. The **Investor**, **PM**, **Tech Lead**, and **Consistency Check** nodes process in iterative rounds until convergence or the configured iteration limit. If needed, a tie-break step completes the debate.
5.  **Stream:** The worker sends tokens to the Redis Channel Layer. Django Channels forwards these to the React client.
6.  **Persistence:** Upon convergence, the worker saves the extracted sections and initial decisions to PostgreSQL and marks the blueprint as `READY`.

### 2.2 Section Regeneration (Consistency-Enforced)
1.  **Trigger:** User requests a rewrite of a specific section in the Document Canvas.
2.  **Retrieval:** Django queries the `Decision Log` for all decisions associated with the parent blueprint.
3.  **Dispatch:** Django sends the rewrite request *plus* the relevant decision context to a Celery task.
4.  **Enforcement:** The task runs the relevant agent or agents for the affected section. A change limited to implementation detail may require only the Tech Lead; a change that affects product scope or business viability may require PM and Investor as well. The Consistency Check node runs after the targeted regeneration to confirm that the proposal still respects the active decision graph.
5.  **Output:** The new section version is saved to the DB, the relevant decisions are updated or superseded as needed, and the update is pushed to the UI via WebSockets.

---

## 3. LangGraph State Graph: The Strategy Room

The "Strategy Room" is modeled as an explicit state graph to move beyond simple linear chains.

### The State Object
The shared state passed between nodes includes:
*   `idea`: The original user prompt.
*   `messages`: The transcript of the debate so far.
*   `agent_outputs`: The structured output emitted by each agent node.
*   `debate_history`: The round-by-round history of proposals and responses.
*   `constraints`: Current business, product, and technical constraints.
*   `conflicts`: Newly discovered conflicts needing resolution.
*   `resolved_conflicts`: Previously resolved conflicts and the chosen resolution.
*   `decisions`: The current active decision set.
*   `pending_decisions`: Proposals that have not yet been committed.
*   `current_agent`: The agent currently executing.
*   `confidence_scores`: Confidence values used to decide whether to continue debating or force convergence.
*   `iteration_count`: The current round number.
*   `blueprint_context`: The evolving document state and version pointers.

### The Nodes
1.  **`Investor`**: Evaluates the idea's commercial feasibility. Establishes budget/market constraints.
2.  **`Product_Manager`**: Defines features and UX roadmap based on Investor constraints.
3.  **`Tech_Lead`**: Selects tools and architecture based on PM features and Investor budget.
4.  **`Consistency_Check`**: A utility node that reviews the state. It looks for contradictions (e.g., PM suggests a feature that the Tech Lead says is impossible under the budget).

### Termination Logic
The graph terminates when:
-   The `Consistency_Check` node returns `CONVERGED` (no conflicts detected).
-   The `turn_count` exceeds a predefined limit (e.g., 5 turns), triggering a "Force Convergence" where the Tech Lead makes the final tie-breaking decisions.

---

## 4. Decision Memory Architecture

The **Decision Memory Engine** is the core differentiator of Foundry. It prevents "Architectural Drift" during long-term editing.

### The Decision Log
Unlike a RAG system that searches external PDFs, Foundry searches its own history. Every key choice made by an agent is stored in the `DecisionLog` table:
```python
{
  "blueprint_id": UUID,
  "node_origin": "Tech_Lead",
  "decision_summary": "Relational Database (PostgreSQL)",
  "reasoning": "Data model requires strict ACID compliance for transaction history."
}
```

### The Consistency Loop
During any regeneration event, the system performs a **Context Injection**:
1.  **Query:** `SELECT * FROM decision_log WHERE blueprint_id = X`
2.  **Format:** Decisions are formatted into a system prompt block: `PAST_DECISIONS: [List of immutable choices]`.
3.  **Prompting:** The LLM is instructed: *"You are rewriting Section Y. You must stay consistent with the following PAST_DECISIONS. If a user request contradicts a PAST_DECISION, warn the user instead of complying."*

---

## 5. Failure & Resilience

### Celery Task Failure
If a Celery worker crashes mid-debate:
-   The `Blueprint` status remains `GENERATING` or moves to `FAILED` via a timeout monitor.
-   The UI detects the `FAILED` status through a periodic poll or WebSocket close event and offers a "Resume Generation" button.
-   Since the state is partially saved in the `DecisionLog`, the debate can be re-initialized using the already-made decisions.

### WebSocket Disconnection
If the user loses internet connection during the stream:
-   The backend continues the debate (it is non-blocking and detached from the socket).
-   Upon reconnection, the React frontend requests the current state of the blueprint from the API.
-   The UI "catches up" by rendering the sections that were completed while the user was offline.

## 6. Expanded LangGraph State Model

The shared state in the Strategy Room is now a first-class architecture artifact rather than a thin container for a few strings.

| Field | Purpose | Evolution |
| :--- | :--- | :--- |
| `idea` | Stores the original user input and any normalized context derived from it. | Fixed at creation, but can be enriched with extracted constraints during the first round. |
| `messages` | Holds the transcript of turns between the agent personas and the user. | Grows with every debate iteration and is preserved for auditability. |
| `agent_outputs` | Stores the raw or structured output emitted by each agent node at each round. | Updated after each node completes and used by later nodes as context. |
| `debate_history` | Captures the round-by-round narrative of the debate. | Appended to after each iteration so regeneration can reconstruct how the blueprint evolved. |
| `constraints` | Stores business, product, or technical constraints generated or accepted by the agents. | Refined as the debate progresses and used to gate later proposals. |
| `conflicts` | Tracks contradictions discovered by the Consistency Check node. | Populated as soon as a conflict appears and persists until resolved. |
| `resolved_conflicts` | Stores the conflict plus the resolution strategy or override applied. | Updated when a conflict is accepted, negotiated, or explicitly overridden. |
| `decisions` | Holds the active, committed decisions that should govern regeneration. | Consolidated after each round and used as the authoritative decision set. |
| `pending_decisions` | Tracks proposals that need review before becoming active. | Cleared as decisions are approved, rejected, or superseded. |
| `current_agent` | Indicates which agent is currently executing in the graph. | Moves forward with each node transition and is exposed to the UI for status streaming. |
| `confidence_scores` | Stores the confidence of each agent or the graph as a whole for key decisions. | Updated after each turn and used to decide whether the debate should continue or be forced to a tie-break and completion. |
| `iteration_count` | Counts how many debate rounds have completed. | Incremented after every round and used for the turn limit enforcement. |
| `blueprint_context` | Holds the evolving blueprint section draft, metadata, and references to prior versions. | Updated as sections are generated and later re-generated. |

This state is persisted between rounds and reused during regeneration. A regeneration request does not start from a blank prompt; it starts from the existing state plus the relevant active decisions.

## 7. Blueprint Lifecycle States

The lifecycle is expanded from a simple status enum to a true document lifecycle that mirrors real editing workflows.

| State | Meaning | Typical Transition |
| :--- | :--- | :--- |
| `DRAFT` | The blueprint exists but has not yet entered generation. | Created from user input. |
| `QUEUED` | Generation has been scheduled. | Transitioned by the job dispatcher. |
| `GENERATING` | One or more agent nodes are actively producing content. | Set by the runtime worker. |
| `PARTIALLY_GENERATED` | Some sections are complete but others are still pending or failed. | Reached after a partial run or interruption. |
| `READY` | The blueprint has passed the initial generation cycle and is editable. | Reached after convergence. |
| `EDITING` | The user is actively modifying or regenerating content. | Entered after the first review session begins. |
| `EXPORTING` | The blueprint is being assembled for markdown/PDF export. | Triggered by the export endpoint. |
| `ARCHIVED` | The blueprint is preserved as a completed artifact but no longer active. | User-initiated or lifecycle-managed. |
| `FAILED` | Generation or regeneration hit a blocking error. | Entered on fatal runtime errors. |
| `DELETED` | The blueprint exists only as a soft-deleted record. | User or admin deletion. |

### Lifecycle Transitions
- A blueprint moves from `DRAFT` to `QUEUED` when the generation job is accepted.
- `QUEUED` moves to `GENERATING` when the worker begins execution.
- `GENERATING` may move to `PARTIALLY_GENERATED` if one or more sections are complete and others are still pending.
- `PARTIALLY_GENERATED` or `GENERATING` may move to `READY` once convergence succeeds.
- `READY` moves to `EDITING` as soon as the user starts a review or regeneration action.
- `EDITING` may return to `GENERATING` when a targeted regeneration is launched.
- `READY` or `EDITING` may move to `EXPORTING` during export.
- `EXPORTING` ends in `ARCHIVED` or `READY` depending on the workflow.
- Any state may transition to `FAILED` on an unrecoverable runtime issue.
- `DELETED` is terminal and should not be used as a target for regular generation.

### Invalid Transitions
- `DRAFT` cannot jump directly to `EXPORTING`.
- `FAILED` cannot transition to `READY` without a new generation attempt or manual recovery.
- `DELETED` cannot be edited, exported, or re-generated.
- `ARCHIVED` should not be used to continue active generation unless the user explicitly restores it.

## 8. LLM Provider Abstraction

Foundry avoids direct provider coupling by introducing a thin execution abstraction at the application boundary.

- `LLMService` is the application-facing interface for prompt execution, streaming, structured output, retries, and timeout handling.
- `GeminiProvider` is the current implementation for v1.
- Additional providers can be plugged in later without changing the orchestration graph.

### Interface Expectations
- The service exposes a streaming interface so the UI can receive tokens progressively.
- It supports structured output for extraction and decision logging.
- It implements retry logic with backoff for transient provider failures.
- It enforces timeout and cancellation boundaries so long-running debate nodes do not hang indefinitely.
- It normalizes provider-specific errors into a small set of application-level error codes.

## 9. Memory Types in the Runtime

Foundry distinguishes between three memory layers to keep the system understandable and reliable.

- **Conversation Memory** stores the temporary discussion transcript, agent messages, and current debate state.
- **Decision Memory** stores the stable commitments and rationales that must govern future updates.
- **Persistent Blueprint** stores the evolving document, section versions, and export artifacts.

This separation prevents the system from conflating active chat context with permanent design commitments.

---

## 10. Implementation Notes & Deviations

* **Soft Deletes Scoping**: Soft deletes are enforced directly at the model manager layer (`BlueprintManager`) by overriding `get_queryset()` to filter out records where `is_deleted = True`. This automatically excludes soft-deleted blueprints from list, retrieve, and query results unless accessed via `all_objects`.
* **State Syncing & WebSockets**: The UI does not poll the backend REST API for status updates. Instead, the Zustand strategy and canvas stores listen to the persistent WebSocket connection (`websocket.js`) and transition states dynamically on `NODE_STARTED`, `NODE_COMPLETED`, `COMPLETE`, or `ERROR` ASGI event packets.
* **LLM Provider Mock Mode**: To allow seamless local development and automated E2E testing without external dependencies, `GeminiProvider` implements an offline mock mode. When dummy credentials are used, it returns simulated streams and structured JSON outputs, detecting keyword tags (like `"mongodb"` in rewrite requests) to trigger conflict and override paths deterministically.