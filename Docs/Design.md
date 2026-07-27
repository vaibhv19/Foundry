# DESIGN.md — Foundry System Architecture

This document defines the technical architecture of **Foundry**. It details how the system orchestrates multi-agent state machines, manages asynchronous execution, and implements the **Decision Memory & Consistency Engine** to ensure structural integrity across blueprint versions.

---

## 1. Component Overview

Foundry is built as a distributed asynchronous system, separating the high-latency AI orchestration from the low-latency web interface.

*   **Django API (Web Layer):** A DRF-based REST API that manages users, blueprint metadata, and section versioning. It acts as the gateway for triggering long-running agent tasks.
*   **Celery Workers (Agent Runtime):** The execution environment for the LangGraph state graph. These workers run the autonomous multi-agent debate off the request thread.
*   **Django Channels (Streaming Layer):** An ASGI-based WebSocket layer that streams real-time LLM tokens and job status updates (`queued → generating → ready`) to the frontend.
*   **Redis (Orchestration Backbone):** Serves two critical roles:
    1.  **Broker:** Handles message passing between Django and Celery.
    2.  **Channel Layer:** Backs the bi-directional WebSocket communication for live streaming.
*   **PostgreSQL (Persistence Layer):** The source of truth for the `Blueprint` relational model, `Section` versions, and the structured `DecisionLog` entries.
*   **Gemini Wrapper:** A minimalist internal class that provides a standardized interface for calling Google’s Gemini models with integrated error handling and streaming support.
*   **LangGraph Agent Process:** A state-machine-based orchestration layer that manages the "Strategy Room" debate, ensuring agents follow a defined turn-order and shared state.

---

## 2. Request Lifecycles

### 2.1 Initial Blueprint Generation
1.  **Trigger:** React sends a startup idea to the API. Django creates a `Blueprint` record with `status=QUEUED`.
2.  **Dispatch:** Django pushes a task to Celery and returns a `202 Accepted` response.
3.  **Connection:** React establishes a WebSocket connection using the returned `blueprint_id`.
4.  **Execution:** The Celery worker initializes the LangGraph. As the **Investor**, **PM**, and **Tech Lead** nodes process, they emit tokens.
5.  **Stream:** The worker sends tokens to the Redis Channel Layer. Django Channels forwards these to the React client.
6.  **Persistence:** Upon convergence, the worker saves the extracted sections and initial decisions to PostgreSQL and marks the blueprint as `READY`.

### 2.2 Section Regeneration (Consistency-Enforced)
1.  **Trigger:** User requests a rewrite of a specific section in the Document Canvas.
2.  **Retrieval:** Django queries the `DecisionLog` for all decisions associated with the parent blueprint.
3.  **Dispatch:** Django sends the rewrite request *plus* the relevant Decision Log context to a Celery task.
4.  **Enforcement:** The task runs a single-agent "Refiner" node. The prompt is strictly constrained by the retrieved decisions (e.g., "Rewrite the Tech Stack, but you must keep PostgreSQL as decided in the initial generation").
5.  **Output:** The new section version is saved to the DB and pushed to the UI via WebSockets.

---

## 3. LangGraph State Graph: The Strategy Room

The "Strategy Room" is modeled as an explicit state graph to move beyond simple linear chains.

### The State Object
The shared state passed between nodes includes:
*   `idea`: The original user prompt.
*   `sections`: A dictionary of generated content per agent (Market, Product, Tech).
*   `decisions`: A list of structured choices extracted from agent output.
*   `turn_count`: An integer to prevent infinite debate loops.

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

The **Decision Memory & Consistency Engine** is the core differentiator of Foundry. It prevents "Architectural Drift" during long-term editing.

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