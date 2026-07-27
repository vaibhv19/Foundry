# Phase 05 — LangGraph Strategy Room Runtime

## Phase Goal
The objective of this phase is to construct the Strategy Room debate engine using LangGraph. We will define the comprehensive shared graph state, build the individual persona nodes (Investor, Product Manager, Tech Lead, Consistency Check, and Tie-Breaker), configure prompt compilation pipelines, implement token budgeting controls, and wire the turn-taking state machine using conditional routing logic based on convergence analysis.

---

## Folder Structure

```text
backend/
├── requirements.txt           # Added langgraph
└── foundry_backend/
    └── strategy_room/         # LangGraph Orchestration App
        ├── __init__.py
        ├── state.py           # Shared State definitions
        ├── prompts.py         # System and Agent prompt blocks
        ├── graph.py           # Compiled Graph state machine
        ├── runner.py          # GraphRunner service class
        ├── nodes/             # Agent Node implementations
        │   ├── __init__.py
        │   ├── investor.py
        │   ├── pm.py
        │   ├── tech_lead.py
        │   ├── consistency.py
        │   └── tie_breaker.py
        └── tests/
            ├── __init__.py
            ├── test_graph.py
            └── test_nodes.py
```

---

## Module Definitions

### 1. Shared Graph State (`StrategyRoomState`)
* **Purpose**: Authoritative memory envelope passed between nodes in the graph execution.
* **Responsibilities**: Representing the active debate transcript, constraints, conflicts, confidence indicators, and iteration counters.
* **Dependencies**: None.
* **Inputs**: Initial user startup idea.
* **Outputs**: Updated state dictionary after each node transition.
* **State Keys**:
  - `idea`: `str` (Immutable source text)
  - `messages`: `list` (Debate transcript logs)
  - `agent_outputs`: `dict` (Raw and structured text block per node)
  - `debate_history`: `list` (Narrative audit logs)
  - `constraints`: `list` (Active business/tech boundaries)
  - `conflicts`: `list` (Found contradictions)
  - `resolved_conflicts`: `list` (Historical overrides)
  - `decisions`: `list` (Committed choices)
  - `pending_decisions`: `list` (Proposed choices)
  - `current_agent`: `str` (Active executing agent node ID)
  - `confidence_scores`: `dict` (Numeric metrics per decision)
  - `iteration_count`: `int` (Current loop index)
  - `blueprint_context`: `dict` (Evolving text structure)

### 2. Strategy Room Agent Nodes
* **Purpose**: Individual executing nodes in the graph.
* **Responsibilities**:
  - **Investor**: Checks business model viability, customer segments, price models, and budget.
  - **Product Manager**: Designs user journeys and proposes feature scope within budget constraints.
  - **Tech Lead**: Recommends technical frameworks, database schemas, and scales within budget constraints.
  - **Consistency Check**: Compares node proposals for logical alignment, increments execution count, and handles convergence routing.
  - **Tie-Breaker**: Selects conservative technical options to force convergence when loops exceed thresholds.
* **Dependencies**: LLM Unified Interface (from Phase 04).

### 3. Graph Runner Orchestrator
* **Purpose**: Initiates and manages the LangGraph session.
* **Responsibilities**: Building the initial state dictionary, compiling the graph structure, running node executions, publishing runtime progress events, and persisting final outputs.
* **Dependencies**: Shared Graph State, Strategy Room Agent Nodes.
* **Public Interfaces**: `GraphRunner.run_initial_debate(blueprint_id)` returning final generated blueprint sections.

---

## Shared Components & Configurations
* **LangGraph Schema Assembly**:
  ```python
  from typing import TypedDict, List, Dict, Any
  from langgraph.graph import StateGraph

  class StrategyRoomState(TypedDict):
      idea: str
      messages: List[Dict[str, Any]]
      agent_outputs: Dict[str, Any]
      debate_history: List[Dict[str, Any]]
      constraints: List[str]
      conflicts: List[Dict[str, Any]]
      resolved_conflicts: List[Dict[str, Any]]
      decisions: List[Dict[str, Any]]
      pending_decisions: List[Dict[str, Any]]
      current_agent: str
      confidence_scores: Dict[str, float]
      iteration_count: int
      blueprint_context: Dict[str, Any]
  ```

---

## Atomic Implementation Tasks

### Task 5.1: Add LangGraph Dependency
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 4.1
* **Description**: Add `langgraph` package to `backend/requirements.txt` and install.
* **Definition of Done**: LangGraph library modules load without exceptions in the backend.

### Task 5.2: Create State definition schema
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 5.1
* **Description**: Create file `foundry_backend/strategy_room/state.py`. Define `StrategyRoomState` class using python standard `TypedDict`. Include all 13 fields listed in the design.
* **Definition of Done**: Schema is declared and can be imported.

### Task 5.3: Define Base Persona System Prompts
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 4.3
* **Description**: Implement system prompt instructions in `strategy_room/prompts.py` for `Investor`, `PM`, `Tech Lead`, `Consistency Check`, and `Tie-Breaker`. Structure prompts in hierarchical layers as defined in [Prompt_Architecture.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Prompt_Architecture.md).
* **Definition of Done**: Prompts are structured as static properties.

### Task 5.4: Implement Investor Node
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 5.3, Task 4.4
* **Description**: Write `investor_node(state: StrategyRoomState) -> dict` in `nodes/investor.py`. Loads system prompts, injects initial `idea` context, calls `LLMService` to evaluate business viability, and returns updated `agent_outputs`, `constraints`, and updates `current_agent = "Investor"`.
* **Definition of Done**: Returns state dictionary matching constraints.

### Task 5.5: Implement Product Manager Node
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 5.4
* **Description**: Write `pm_node(state: StrategyRoomState) -> dict` in `nodes/pm.py`. Loads PM prompts, injects Investor `constraints` from state, calls LLM to generate user-facing product features, and returns state updates, setting `current_agent = "Product_Manager"`.
* **Definition of Done**: Returns state dictionary containing proposed product strategy.

### Task 5.6: Implement Tech Lead Node
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 5.5
* **Description**: Write `tech_lead_node(state: StrategyRoomState) -> dict` in `nodes/tech_lead.py`. Loads Tech Lead prompts, injects PM feature list and Investor budget constraints, calls LLM to recommend technology stack and database options, and returns state updates, setting `current_agent = "Tech_Lead"`.
* **Definition of Done**: Returns state dictionary containing architectural stack choices.

### Task 5.7: Implement Consistency Check Node
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 5.6
* **Description**: Write `consistency_check_node(state: StrategyRoomState) -> dict` in `nodes/consistency.py`. Standardizes conflict validation:
  - Call LLM using structured output model mapping conflicts.
  - Increment `iteration_count` by 1.
  - Return state updates containing any identified `conflicts`.
* **Definition of Done**: Node evaluates state and populates conflicts list.

### Task 5.8: Implement Tie-Breaker Node
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 5.7
* **Description**: Write `tie_breaker_node(state: StrategyRoomState) -> dict` in `nodes/tie_breaker.py`. Instructs Tech Lead to pick the lowest-risk architecture and tells Investor/PM to accept cost constraints, resolving any persistent conflicts.
* **Definition of Done**: Node returns state clearing active conflicts.

### Task 5.9: Assemble Graph Routing Logic and Compile State Machine
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 5.8
* **Description**: Write `strategy_room/graph.py`. Initialize `StateGraph(StrategyRoomState)`. Add all 5 nodes. Define edges:
  - `START` -> `Investor` -> `PM` -> `Tech_Lead` -> `Consistency_Check`.
  - Conditional edge from `Consistency_Check`:
    - If `conflicts` is empty -> `END`.
    - If `conflicts` exists and `iteration_count` < 5 -> loop back to `Investor` (for negotiation).
    - If `conflicts` exists and `iteration_count` >= 5 -> `Tie-Breaker` -> `END`.
* **Definition of Done**: Graph compiles successfully without orphan nodes.

### Task 5.10: Implement GraphRunner Service Wrapper
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 5.9, Task 3.4
* **Description**: Implement `GraphRunner` in `strategy_room/runner.py` that handles execution setup:
  - Fetches target `Blueprint` and `Idea` records from DB.
  - Builds initial `StrategyRoomState` dictionary.
  - Runs graph loop and returns finalized state.
* **Definition of Done**: Runner executes complete loop on mocking.

### Task 5.11: Write Graph Execution Unit Tests
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 5.10
* **Description**: Write pytest test suite for the graph. Mock Gemini provider to return pre-defined strings and structured schemas. Verify:
  - Turn-taking transitions occur in exact sequence.
  - Convergence check conditional routing loops back if conflict is injected, and exits on success.
  - Tie-breaker is correctly triggered when iteration threshold is exceeded.
* **Definition of Done**: Running `pytest` completes all graph execution assertions.

---

## Milestone Verification Checkpoint (Milestone 02-B)
* **Status**: Running suite.
* **Behavior**: Developer can execute `GraphRunner.run_initial_debate(blueprint_id)` in local shell, running debate logic offline and logging updates.
* **Incomplete Features**: No real-time token streaming, no frontend UI.

---

## Suggested Git Commits
- `feat/ai/graph-state`: LangGraph state schema definition.
- `feat/ai/graph-prompts`: Persona-specific system instruction blocks.
- `feat/ai/graph-nodes`: Investor, PM, Tech Lead node actions.
- `feat/ai/graph-consistency`: Consistency check and tie-breaker nodes.
- `feat/ai/graph-compile`: Graph assembly and conditional routing compilation.
- `feat/ai/graph-runner`: GraphRunner setup orchestrator.
- `test/ai/graph-runtime`: Graph routing integration tests.

---

## Suggested GitHub Issues
* **Issue #2.3**: Define LangGraph shared state schemas and node transition models.
* **Issue #2.4**: Implement Investor, PM, and Tech Lead agent nodes with distinct instructions.
* **Issue #2.5**: Implement Consistency Check convergence and tie-breaker nodes.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/05_LangGraph_Multi_Agent_Orchestration.md`**: Document agent state tracking, looping and negotiation designs, convergence checks, and tie-breaking algorithms.
