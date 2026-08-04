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
