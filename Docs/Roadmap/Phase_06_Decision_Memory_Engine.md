# Phase 06 — Decision Memory Engine

## Phase Goal
The objective of this phase is to build the core Decision Memory Engine. We will implement the `DecisionLog` relational operations, write Pydantic schemas for structured extraction of choices from raw agent prose, implement the SQL-based "Consistency Join" retrieval, construct the Comparison Hash conflict detector, develop the manual override handler, and implement the Decision Graph dependency tracking edges for cascading conflict propagation.

## Why This Phase Comes Now
The Decision Memory storage, retrieval, and conflict detection logic must be defined before we wire it into Celery tasks and Django Channels for real-time streaming and async execution.

---

## Folder Structure

```text
backend/
└── foundry_backend/
    ├── decision_memory/       # Decision Memory Engine app
    │   ├── __init__.py
    │   ├── models.py          # DecisionDependency model
    │   ├── engine.py          # DecisionMemoryEngine class
    │   ├── schemas.py         # Pydantic extraction models
    │   ├── extractor.py       # Pydantic LLM extractor
    │   ├── conflict.py        # Comparison Hash conflict validator
    │   ├── graph.py           # Dependency graph analyser
    │   └── tests/
    │       ├── __init__.py
    │       ├── test_engine.py
    │       ├── test_extractor.py
    │       ├── test_conflict.py
    │       └── test_graph.py
    └── blueprints/
        └── models.py          # References DecisionLog model defined in Phase 03
```

---

## Module Definitions

### 1. Decision Log Extractor
* **Purpose**: Parses generated agent prose to identify durable design choices.
* **Responsibilities**: Invoking `LLMService.generate_structured` using custom prompts to isolate commitments from opinions.
* **Dependencies**: LLM Abstraction Layer (from Phase 04).
* **Inputs**: Raw text output of a completed debate node.
* **Outputs**: List of structured Pydantic object dicts: `[{"decision_key", "choice_value", "rationale", "priority", "node_origin", "category"}]`.
* **Public Interfaces**: `DecisionExtractor.extract_decisions_from_text(text, node_origin)`

### 2. Consistency Join Retriever
* **Purpose**: Retrieves active database constraints.
* **Responsibilities**: Performing optimized SQL queries on `DecisionLog` filtering by `blueprint_id` and `is_active=True`, formatting records into markdown prompt blocks.
* **Dependencies**: Relational Domain Models (from Phase 03).
* **Inputs**: `blueprint_id` (UUID).
* **Outputs**: Markdown string formatting choices (e.g. `### IMMUTABLE DESIGN CONSTRAINTS`).
* **Public Interfaces**: `DecisionMemoryEngine.retrieve_context_block(blueprint_id)`

### 3. Comparison Hash Conflict Detector
* **Purpose**: Computes structural conflicts before text generation.
* **Responsibilities**: Checking proposed decisions against active ones using Comparison Hash rules:
  - If `Proposed.decision_key == Stored.decision_key` and `Proposed.choice_value != Stored.choice_value` -> conflict detected.
* **Dependencies**: None.
* **Inputs**: List of proposed decisions and active decisions.
* **Outputs**: List of conflict structures (key, old value, proposed value, priority, conflict details).
* **Public Interfaces**: `ConflictDetector.detect_conflicts(proposed_list, active_list)`

### 4. Override & Dependency Graph Router
* **Purpose**: Handles overrides and maps decision dependencies.
* **Responsibilities**:
  - superseding older decisions: setting `is_active=False` and recording the `supersedes_id` FK.
  - storing and traversing decision graph dependencies (`DecisionDependency`).
  - identifying child decisions affected by a parent change.
* **Dependencies**: Database access.
* **Public Interfaces**:
  - `DecisionMemoryEngine.apply_override(decision_id, choice_value, rationale)`
  - `DecisionMemoryEngine.get_downstream_impact(blueprint_id, changed_key)`

---

## DB Mappings & Schemas (Decision Dependency)
* **`DecisionDependency` Table**:
  | Column | Type | Constraints |
  | :--- | :--- | :--- |
  | `id` | `UUID` | PK, Default: gen_random_uuid() |
  | `blueprint_id` | `UUID` | FK (blueprints.id), Not Null |
  | `parent_key` | `VARCHAR(100)`| Not Null (e.g., `primary_database`) |
  | `child_key` | `VARCHAR(100)`| Not Null (e.g., `orm_layer`) |

* **Extraction Pydantic Schema**:
  ```python
  from pydantic import BaseModel, Field
  from typing import List, Optional

  class DecisionSchema(BaseModel):
      decision_key: str = Field(description="Normalized slug representation of choice")
      choice_value: str = Field(description="The concrete framework/technology/value selected")
      rationale: str = Field(description="The architectural or business reasoning why this was chosen")
      category: str = Field(description="One of: MARKET, PRODUCT, TECH_STACK, BUSINESS")
      priority: str = Field(description="P0, P1, or P2 priority rating")
  ```

---

## Atomic Implementation Tasks

### Task 6.1: Define Extraction Pydantic schemas
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 4.1
* **Description**: Create file `foundry_backend/decision_memory/schemas.py`. Define Pydantic models for structured outputs: `DecisionSchema` and `DecisionExtractionResult` (containing a list of `DecisionSchema`).
* **Definition of Done**: Schema models compile and support JSON exports.

### Task 6.2: Implement Decision Extractor Service
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 6.1, Task 4.5
* **Description**: Write `DecisionExtractor` in `decision_memory/extractor.py`. Instructs Gemini to evaluate text using prompt rules from `Prompt_Architecture.md`:
  - Ignore word changes or styling.
  - Capture durable choices passing "Commitment Test".
  - Output structured JSON matching `DecisionExtractionResult`.
* **Definition of Done**: Service parses dummy text and extracts correct choices as Pydantic models.

### Task 6.3: Implement Context Retrieval Engine (Consistency Join)
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.4
* **Description**: Write `DecisionMemoryEngine.retrieve_context_block(blueprint_id)` in `decision_memory/engine.py`. Executes query:
  `SELECT decision_key, choice_value, rationale, category FROM decision_log WHERE blueprint_id = :id AND is_active = TRUE`
  Formats output into Markdown `ACTIVE_DECISIONS` block.
* **Definition of Done**: Query successfully fetches database rows and maps them to a markdown context prompt.

### Task 6.4: Write Comparison Hash Conflict Detector
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 6.2
* **Description**: Implement `ConflictDetector` in `decision_memory/conflict.py`. Compares a list of newly proposed decisions against active ones. Applies comparison logic:
  - If keys match and values diverge, flag a conflict.
  - Extract the priority of the conflicting active decision (e.g. P0 conflicts block auto-generation, requiring client override).
* **Definition of Done**: Detector correctly returns lists of conflict instances for diverging inputs.

### Task 6.5: Implement Decision Dependency DB Model
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 3.4
* **Description**: Define `DecisionDependency` model in `decision_memory/models.py`. Generate database migrations and run `python manage.py migrate`.
* **Definition of Done**: Database table is created.

### Task 6.6: Build Dependency Impact Graph Traverser
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 6.5
* **Description**: Write graph analysis utility in `decision_memory/graph.py`. When a parent decision changes, traverse dependency tree edges to identify all downstream child decisions that must be invalidated or flagged for review.
* **Definition of Done**: Returns list of downstream decision keys given a root key.

### Task 6.7: Implement Manual Override Service Actions
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 6.4, Task 6.6
* **Description**: Write `DecisionMemoryEngine.apply_override(decision_id, choice_value, rationale)` in `engine.py`. This method runs inside a transaction:
  - Fetch active decision by `decision_id`.
  - Set `is_active = False` on it.
  - Create a new active `DecisionLog` record with the overridden value, pointing `supersedes_id` to the old ID.
  - Locate downstream dependencies and flag them for review.
* **Definition of Done**: Override database writes completed and verified.

### Task 6.8: Write Decision Memory Engine Unit Tests
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 6.7
* **Description**: Write pytest unit tests verifying:
  - Structured extraction returns correct schemas.
  - Comparison hash detects mismatches.
  - Dependency traverser tracks parent-child cascades.
  - Override transaction updates active flags and sets `supersedes_id` link correctly.
* **Definition of Done**: All tests pass.

---

## Milestone Verification Checkpoint (Milestone 03-A)
* **Status**: Running suite.
* **Behavior**: Full relational decision tracing and conflict detection runs in memory. An override command propagates changes and updates the active set.
* **Incomplete Features**: No WebSockets, no Celery task integration.

---

## Developer Validation Checklist
- [ ] Pydantic decision extraction schemas load and support structured JSON dumps correctly.
- [ ] `DecisionExtractor` extracts durable architectural and business choices from dummy text.
- [ ] SQL-based "Consistency Join" retrieval query returns active, non-superseded decision logs.
- [ ] Conflict detector successfully identifies key collisions and value divergences.
- [ ] Decision Dependency database tables are created and migrate successfully.
- [ ] Dependency Impact Graph Traverser identifies all downstream child decisions affected by a parent change.
- [ ] Manual override transaction correctly deactivates old decisions and creates linked superseding records.
- [ ] Pytest suite passes all Decision Memory Engine unit tests.

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

* **Suggested Branch Name**: `feat/ai/decision-memory`
* **Suggested Merge Point**: `develop`
* **Suggested Tag**: `v1.0.0-phase06`
* **Suggested Commit Grouping**:
  - `feat/ai/decision-schemas`: Pydantic models for structured extraction
  - `feat/ai/decision-extractor`: Extractor service and system prompt wrapper
  - `feat/ai/decision-retriever`: SQL context retrieval and formatting
  - `feat/ai/conflict-detector`: Comparison Hash validator
  - `feat/backend/dependency-model`: Dependency table creation and migration
  - `feat/ai/dependency-traverser`: Dependency impact analyzer
  - `feat/backend/override-service`: Override transaction handlers
  - `test/backend/decision-engine`: Complete test suite for extractor, retriever, and conflict

---

## Suggested GitHub Issues
* **Issue #3.1**: Create Decision Log extractor with structured JSON output (Pydantic).
* **Issue #3.2**: Implement context retrieval queries and prompt injection formatter.

---

## Learning Document
* **[06_Decision_Memory_Consistency.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Learning/06_Decision_Memory_Consistency.md)**: Detail the "Consistency Join" query performance, comparison hash conflict detection rules, and relational overrides. After completing this phase, document the consistency join schema queries, decision log parsing examples, and dependency cascade graphs.
