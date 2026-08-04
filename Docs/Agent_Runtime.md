# Agent Runtime — Foundry

This document describes the runtime environment that executes the Strategy Room debate and the targeted regeneration workflows. It is the operational layer that turns the design documents into live, stateful agent execution.

---

## 1. Runtime Responsibilities

The agent runtime is responsible for:
- orchestrating the LangGraph state machine
- streaming node activity to the UI
- persisting debate state and decisions
- handling retries, timeouts, and failures
- creating section versions during regeneration

The runtime is intentionally separated from the web layer so that the debate can continue independently of the user's browser connection.

Foundry has three related but distinct state machines: the blueprint lifecycle, the job lifecycle, and the agent runtime lifecycle. The blueprint lifecycle governs the document itself, the job lifecycle governs scheduling, and the agent runtime lifecycle governs the execution of a specific run.

---

## 2. Core Runtime Components

- **Graph Runner**: Executes the current LangGraph workflow for a blueprint.
- **State Store**: Maintains the evolving LangGraph state including messages, decisions, conflicts, and iteration count.
- **LLM Adapter**: Wraps the provider abstraction and ensures all nodes use consistent streaming and structured output handling.
- **Event Publisher**: Emits websocket and persistence events for the UI and the database.
- **Version Manager**: Creates or updates section versions when new content is generated.

---

## 3. Execution Model

Each blueprint run has a lifecycle:

1. The runtime loads the blueprint and its prior decision history.
2. It creates or resumes a graph state for the relevant execution mode.
3. It runs the next node in the graph.
4. It updates the state and publishes progress events.
5. It persists the new state and any new decisions before moving to the next node.

The runtime supports both:
- **Initial Debate Generation** for a new blueprint
- **Targeted Regeneration** for a specific section or decision chain

---

## 4. Node Contract

Each node in the graph receives a state object and returns an updated state object.

The expected contract is:
- read the current shared state
- add or update the relevant output
- update the decision or conflict list when necessary
- emit a progress event for the UI
- return the new state for the next node

The runtime treats this as a strict contract so that the graph is deterministic enough to debug, test, and inspect.

---

## 5. Execution Lifecycle

A run can exist in the following operational states:

- `PENDING`: scheduled but not started
- `RUNNING`: actively executing a node
- `COMPLETED`: the graph finished successfully
- `FAILED`: the run ended in an unrecoverable error

These states are distinct from the blueprint lifecycle states in [Design.md](Design.md), although they are related and often updated together.
The runtime state for an active debate is held in LangGraph checkpoints while the durable view of decisions, events, and versions is stored in PostgreSQL. Redis is used for queueing and WebSocket fan-out rather than as the source of truth.
---

## 6. Streaming and Progress Events

The runtime emits structured events during execution. These events are consumed by the WebSocket layer and the persistence layer.

Typical events include:
- `JOB_CREATED`
- `NODE_STARTED`
- `NODE_COMPLETED`
- `TOKEN`
- `STATUS`
- `ERROR`

These events are also stored in the `generation_events` table for traceability and debugging.

---

## 7. Resumability and Recovery

The runtime is designed to resume from partial state when possible.

If generation is interrupted:
- the last known state is preserved
- the current blueprint can move to `PARTIALLY_GENERATED` or `FAILED`
- the user can retry generation from the current state

The runtime does not need to restart from scratch because the decision memory and debate history are persisted between runs.

---

## 8. Related Documents

- [Design.md](Design.md)
- [App_Flow.md](App_Flow.md)
- [WebSocket_Protocol.md](WebSocket_Protocol.md)

## 9. Engineering Rationale & Background Jobs Architecture

### 9.1 Background Agent Processing (Celery)
Multi-agent debates are execution-heavy: they orchestrate multiple LLM queries, evaluate structured output schemas, parse constraints, and verify logical consistency.
* **Process Isolation**: Running the LangGraph state machine inside background Celery worker daemons isolates these heavy CPU and network operations from the web uWSGI/Daphne workers. This prevents HTTP request starvation, keeping the core web interface highly responsive.
* **Redis as a Task Broker**: Redis acts as the message broker, providing low-latency queueing and FIFO task execution.

### 9.2 Relational Checkpoint Persistence
Default LangGraph architectures use memory savers (`MemorySaver`) or local database checkpointers (`SqliteSaver`) to track run states.
* **Django ORM Consolidation**: Foundry maps graph checkpoints directly to Django relational models (`AgentRun`, `AgentMessage`, `GenerationEvent`, `DecisionLog`, `Version`). 
* **Benefits**:
  1. Consolidated persistence: PostgreSQL remains the single source of truth, avoiding the synchronization issues of separate SQLite checkpointer files.
  2. Transactional safety: Database mutations happen within Django transactions, ensuring that decisions and section version updates are saved atomically.
  3. Relational querying: Client applications can query, list, search, and delete run history directly using standard REST serializers.

### 9.3 Real-time ASGI Event Streaming
To stream tokens as they generate:
* **Redis Channels Group**: The Celery worker task publishes events to a Redis group channel key named `blueprint_{blueprint_id}`.
* **ASGI Consumer Broadcast**: The Django ASGI container (`Daphne`) runs a corresponding `StrategyConsumer` WebSocket loop. It subscribes to the channel group, intercepts the task messages, and writes them straight to the client socket buffers.

---

## 10. Implementation Notes & Deviations

* **State Checkpointing & Persistence**: In the final implementation, LangGraph execution state checkpoints are not kept using native SQLite/PostgreSQL checkpoint savers. Instead, task-level inputs and outputs are persisted to Django model tables (`AgentRun`, `AgentMessage`, `GenerationEvent`, `DecisionLog`) on each node transition inside the Celery worker thread context.
* **Celery Async Workers**: The runtime is executed in a background worker context via Celery tasks (`run_strategy_debate` and `run_section_regeneration`). Progress logs and streaming tokens are published to a Redis channel layer group (`blueprint_{id}`), which the Django ASGI Daphne container listens to and broadcasts over WebSocket connections to active clients.


