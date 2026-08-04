# Targeted Regeneration and Conflict Resolution

This document details the engineering specifications for section-specific regeneration, automated conflict checks, override cascade warnings, and database transaction boundaries for version rollbacks implemented in Phase 08.

## 1. Partial Graph Routing

During initial debate, the multi-agent graph runs through a full sequential debate of all persona nodes. During targeted section regeneration, we avoid running the entire debate by invoking only a category-specific subsequence:

-   **`TECH_STACK`**: Starts at `Tech_Lead` -> `Consistency_Check`.
-   **`PRODUCT`**: Starts at `Product_Manager` -> `Tech_Lead` -> `Consistency_Check`.
-   **`MARKET` / `BUSINESS`**: Starts at `Investor` -> `PM` -> `Tech_Lead` -> `Consistency_Check`.

This subsequence is mapped via the `AgentRouter` class. Prior sibling sections' content is loaded into the `StrategyRoomState`'s `agent_outputs` to ground the LLM persona's context.

---

## 2. Comparison Hash Conflict Interceptors

When a section is regenerated, we extract proposed choices using `DecisionExtractor`. These proposed decisions are compared against active database decisions using `ConflictDetector.detect_conflicts`:

```text
    [Proposed Choices]                 [Active Database Decisions]
            │                                      │
            ▼                                      ▼
     +──────────────────────────────────────────────────+
     |                ConflictDetector                  |
     +────────────────────────┬─────────────────────────+
                              │
                     Mismatches Detected?
                    /                    \
                  YES                     NO
                  /                         \
       [Enforce Decisions?]             [Save Version & Decisions]
          /            \
        YES             NO
        /                 \
[Raise Exception &]   [Override Decisions]
[Rollback Version ]
```

-   If `enforce_previous_decisions=True`, the task raises a `ConsistencyViolationError`. The transaction is aborted, the job status is set to `FAILURE` with error `DECISION_OVERRIDE_REQUIRED`, and a WebSocket `ERROR` with the conflict details is broadcast.
-   If `enforce_previous_decisions=False`, the transaction deactivates conflicting decisions, applies manual overrides, cascades deactivations to child decisions, and persists the new choices.

---

## 3. Override Cascades and Warnings

When an override is applied or forced via section regeneration, dependent choices in the `DecisionDependency` tree are recursively deactivated. We log a `MANUAL_OVERRIDE` event in the `generation_events` table containing details of:
-   The new override decision ID.
-   The overridden key.
-   The new choice value.
-   All deactivated child keys.

The frontend client reads these events to show validation alerts prompting the user to review affected sections.

---

## 4. Version Rollback Transaction Boundaries

The `DecisionMemoryEngine.rollback_to_version` method executes within a Django `@transaction.atomic` block:

1.  **Version Activation**: Sets the selected historical `Version.is_active = True` and all sibling versions to `False`.
2.  **Post-Rollback Deactivation**: Deactivates all `DecisionLog` records associated with the blueprint created after the target version's `created_at` timestamp.
3.  **Historical Reactivation**: Queries all historical `DecisionLog` records created on or before the target version. For each record, if no newer superseding decision was created on or before that historical timestamp, the record is reactivated (`is_active = True`). All others remain inactive.

---

## 5. Engineering Lessons & Troubleshooting Stories

### 5.1 LLM Parsing Isolation Outside DB Transactions
* **Problem**: In early versions, we wrapped the entire section regeneration Celery task (including the LLM call to generate content, the `DecisionExtractor` parser call, the `ConflictDetector` analysis, and the database updates) inside a single `transaction.atomic()` block. If the LLM failed to return valid JSON or timed out, the transaction was aborted, but the long-running query kept database locks active, resulting in temporary DB connection timeouts.
* **Solution**: We isolated database writes. The LLM text generation, JSON schema validation, and conflict verification checks are executed *first* outside of any transaction block. Only after the output is validated and conflict checks pass do we open a `with transaction.atomic():` block to write the new version and update the active decision logs. This minimizes transaction lock durations to milliseconds.

### 5.2 React Conflict Warning Modal UI Lockups
* **Problem**: In the Document Canvas UI, when a conflict was surfaced, clicking the "Override & Regenerate" button successfully sent the override REST request, but the modal did not close, preventing the user from observing the regeneration stream.
* **Why it happened**: The override submit action did not clear the `conflictAlert` state inside the Zustand `canvasStore`. The store triggered a re-fetch of blueprint data which returned success, but because the local conflict state remained populated, the React view continued to render the warning modal.
* **Solution**: We added a clear hook inside the submit action handler. The component invokes `clearConflicts()` to reset the alert state *before* triggering the new regeneration background task, allowing the UI modal to close and enabling smooth transitions to streaming modes.
