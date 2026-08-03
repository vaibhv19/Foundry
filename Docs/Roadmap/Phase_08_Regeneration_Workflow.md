# Phase 08 — Targeted Regeneration & Rollback

## Phase Goal
The objective of this phase is to construct the targeted, consistency-enforced section regeneration and rollback mechanisms. We will build a partial agent routing manager to execute targeted graph sub-paths based on modified section categories, write the regeneration Celery tasks, wire the pre-generation Comparison Hash validations to intercept conflicts, establish override propagation workflows, and implement the database transactions for version restoration and decision state rollbacks.

## Why This Phase Comes Now
The complete set of backend APIs, background tasks, and streaming endpoints (including regeneration and rollback) must be fully functional and verified before building the React frontend client layers to consume them.

---

## Folder Structure

```text
backend/
└── foundry_backend/
    ├── strategy_room/
    │   ├── routing_rules.py   # Partial agent routing decisions
    │   └── tasks.py           # Updated with run_section_regeneration
    └── decision_memory/
        ├── engine.py          # Updated with rollback and override methods
        └── tests/
            ├── test_regeneration.py
            └── test_rollback.py
```

---

## Module Definitions

### 1. Partial Agent Graph Router
* **Purpose**: Maps section updates to the appropriate AI persona executions.
* **Responsibilities**: Inspecting the category of a target section and returning the execution path list (e.g. category `TECH_STACK` routing to `Tech_Lead` and `Consistency_Check`; category `PRODUCT` routing to `PM`, `Tech_Lead`, and `Consistency_Check`).
* **Dependencies**: LangGraph State definitions.
* **Inputs**: `Section` category.
* **Outputs**: Array of agent node IDs.
* **Public Interfaces**: `AgentRouter.get_execution_nodes(section_category)`

### 2. Targeted Section Regeneration Worker
* **Purpose**: Coordinates async rewrite generation with active constraints.
* **Responsibilities**: Fetching active decision contexts, compiling prompt injection wrappers, invoking the partial agent path, checking for conflicts, and saving output as a new `Version`.
* **Dependencies**: Context Retrieval Engine, Channels Event Publisher.
* **Inputs**: `section_id` (UUID), `user_note` (string), `enforce_previous_decisions` (boolean).
* **Outputs**: Writes new `Version` record and updates `decision_log` links, publishes WebSocket complete events.
* **Public Interfaces**: Celery task `run_section_regeneration.delay(section_id, user_note, enforce_previous_decisions)`.

### 3. Cascading Dependency Analyzer
* **Purpose**: Validates system integrity when core decisions are overridden.
* **Responsibilities**: Scanning database tables for downstream edges when a decision is overridden, marking dependent decisions as `is_active=False` (or flagging them for review), and returning warning payloads.
* **Dependencies**: Decision Dependency Model (from Phase 06).
* **Inputs**: `blueprint_id` (UUID), `changed_key` (string).
* **Outputs**: List of affected downstream decision keys.

### 4. Rollback State Recoverer
* **Purpose**: Toggles active historical documents and active decision logs in lockstep.
* **Responsibilities**: Executing atomic database transactions to restore selected versions:
  - Deactivating current active version and marking selected version `is_active=True`.
  - Deactivating all decisions created after the restored version's timestamp.
  - Reactivating historical decisions that were active when the restored version was created (`created_by_version_id` context).
* **Dependencies**: Database Transaction controller.
* **Inputs**: `version_id` (UUID).
* **Outputs**: Updates version and decision records.
* **Public Interfaces**: `DecisionMemoryEngine.rollback_to_version(version_id)`

---

## Atomic Implementation Tasks

### Task 8.1: Implement Partial Agent Router
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 5.9
* **Description**: Create file `strategy_room/routing_rules.py`. Write routing functions mapping section categories to agent nodes. For example:
  - `TECH_STACK`: Runs `Tech_Lead` -> `Consistency_Check`.
  - `PRODUCT`: Runs `PM` -> `Tech_Lead` -> `Consistency_Check`.
  - `MARKET` / `BUSINESS`: Runs `Investor` -> `PM` -> `Tech_Lead` -> `Consistency_Check`.
* **Definition of Done**: Router returns correct sequence array for each category type.

### Task 8.2: Implement Targeted Section Regeneration Task
* **Size**: S
* **Risk**: High
* **Prerequisites**: Task 8.1, Task 7.8, Task 6.3
* **Description**: Write Celery task `run_section_regeneration` in `strategy_room/tasks.py`. Steps:
  - Fetch target `Section` and parent `Blueprint` (status set to `GENERATING`).
  - Retrieve active decisions for the blueprint.
  - Inject active decisions into the prompt context.
  - Execute LangGraph overriding the starting node to run only the targeted agent subsequence.
  - If `enforce_previous_decisions=True` and LLM attempts to propose conflicting values, raise `ConsistencyViolationError`.
  - Write result as new active `Version`.
* **Definition of Done**: Task successfully completes partial graph run and writes version.

### Task 8.3: Add Automated Conflict Interceptors to Regeneration Task
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 8.2, Task 6.4
* **Description**: Integrate the `ConflictDetector` comparison checks into the post-generation callback of `run_section_regeneration`:
  - Run extractor Pydantic parser on new agent prose.
  - Execute `detect_conflicts`.
  - If conflict exists, rollback version write, set job status to `FAILED` with error `DECISION_OVERRIDE_REQUIRED`, and publish WebSocket `ERROR` detailing the conflict.
* **Definition of Done**: Conflicting edits are blocked and generate standard WebSocket error payloads.

### Task 8.4: Implement Cascading Impact Warnings
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 8.3, Task 6.7
* **Description**: Implement downstream cascade logging inside `DecisionMemoryEngine.apply_override()`. When a user chooses to force an override (making the conflicting decision active):
  - Traverse `DecisionDependency` tree.
  - Locate all child decisions.
  - Deactivate children and mark them for review in the database.
  - Record events in `generation_events` table so the UI can prompt the user to review dependent sections.
* **Definition of Done**: Overrides successfully propagate downstream and update active statuses.

### Task 8.5: Implement Version Rollback and Decision Re-activation Transaction
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 3.7, Task 6.7
* **Description**: Write database transactional method `DecisionMemoryEngine.rollback_to_version(version_id)` in `decision_memory/engine.py`. Using Django `@transaction.atomic`:
  - Fetch target version. Mark it `is_active=True`.
  - Set all other sibling versions for that section `is_active=False`.
  - Deactivate all decisions associated with the blueprint that were created by versions newer than the restored version.
  - Reactivate the decisions that were active when the restored version was created (identifiable via `created_by_version_id` links).
* **Definition of Done**: Rollback transaction executes atomically, syncing versions and decisions without orphans.

### Task 8.6: Write Targeted Regeneration and Transaction Rollback Tests
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 8.5
* **Description**: Write comprehensive integration tests:
  - Submit rewrite request violating active database decision (asserting it fails and logs conflict).
  - Submit request with `enforce_previous_decisions=False` (asserting old decision becomes inactive and is superseded by the new choice).
  - Assert that downstream dependencies of the overridden choice are flagged correctly.
  - Restore a historical version and assert database active decisions match historical values.
* **Definition of Done**: All integration assertions pass successfully under `pytest`.

---

## Milestone Verification Checkpoint (Milestone 04-A)
* **Status**: Running suite.
* **Behavior**: Full backend capabilities are verified. Users can trigger section-specific regenerations, handle overrides, resolve conflicts, and rollback versions via REST endpoints.
* **Incomplete Features**: Frontend client interface.

---

## Developer Validation Checklist
- [ ] Partial agent router maps categories (`TECH_STACK`, `PRODUCT`, `MARKET`, etc.) to the correct node execution sequences.
- [ ] Section regeneration background tasks start successfully and load the correct historical state.
- [ ] Automated conflict detector checks intercepts and detects inconsistencies.
- [ ] Consistency violations successfully trigger rollback of new version writes.
- [ ] WebSocket error event broadcasts correct conflict details to active channel groups.
- [ ] Cascading impact warnings correctly propagate through the `DecisionDependency` tree.
- [ ] Version rollback transactions safely restore active states and revert decision overrides.
- [ ] Pytest suite verifies regeneration sub-path routing and rollback transactions.

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

* **Suggested Branch Name**: `feat/ai/targeted-regeneration`
* **Suggested Merge Point**: `develop`
* **Suggested Tag**: `v1.0.0-phase08`
* **Suggested Commit Grouping**:
  - `feat/ai/partial-router`: Partial graph routing manager
  - `feat/ai/comparison-hash-interceptor`: Conflict check filters
  - `feat/backend/regeneration-task`: Celery tasks for partial debate updates
  - `feat/backend/override-propagation`: Cascading override updates
  - `feat/backend/rollback-transactions`: Version restoration database transactional logic
  - `test/backend/regeneration-rollback`: Targeted regeneration test coverage

---

## Suggested GitHub Issues
* **Issue #4.1**: Develop section-aware targeted debate runner.
* **Issue #4.2**: Implement comparison-hash rules for automated conflict detection.
* **Issue #4.3**: Implement Manual Override updates and decision superseding.
* **Issue #4.4**: Add version restoration logic and decision rollback.
* **Issue #4.5**: Implement export compiling service (Markdown to PDF/MD).

---

## Learning Document
* **[08_Targeted_Regeneration_And_Conflict_Resolution.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Learning/08_Targeted_Regeneration_And_Conflict_Resolution.md)**: Detail partial graph routes, comparison hash intercepts, override cascades, and transaction boundaries during rollbacks. After completing this phase, document the partial routing workflows, conflict intercept handlers, and transaction rollback boundaries.
