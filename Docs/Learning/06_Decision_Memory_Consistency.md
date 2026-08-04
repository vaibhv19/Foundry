# Decision Memory Consistency

This document details the relational database design, query formatting, conflict detection logic, and cascading override mechanisms implemented for the Decision Memory Engine in Phase 06.

## 1. Relational Decision Architecture

To ensure logical alignment across multi-turn agent debates, we capture design choices as atomic facts rather than relying on unstructured context retrieval.

```text
  +------------------+
  |    Blueprint     |
  +--------┬---------+
           | 1
           | M
  +--------v---------+
  |   DecisionLog    |<---------------+ (supersedes_id)
  +--------┬---------+                |
           | 1                        | (Self-Reference)
           | M                        |
  +--------v---------+                |
  |DecisionDependency|----------------+
  +------------------+
```

### Table Mappings

-   **`DecisionLog`**: Persists atomic design commitments made by agents or overrides applied by users.
-   **`DecisionDependency`**: Establishes directed parent-child dependency edges (e.g., `database` -> `orm`).

---

## 2. Consistency Join Context Retrieval

The "Consistency Join" retrieval aggregates all active commitments for a given blueprint:

```sql
SELECT decision_key, choice_value, rationale, category, priority
FROM blueprints_decisionlog
WHERE blueprint_id = :id AND is_active = TRUE
```

The retrieved rows are formatted into a markdown prompt segment:

```text
ACTIVE_DECISIONS
- database: PostgreSQL
- orm: DjangoORM
```

This segment is deterministically injected into agent system prompts to ground them in prior commitments.

---

## 3. Comparison Hash Conflict Detection

Proposed decisions are validated against active stored decisions before database execution using Comparison Hash rules:

-   **Duplicate Check**: If `Proposed.decision_key == Stored.decision_key`.
-   **Divergence Check**: If `Proposed.choice_value != Stored.choice_value`.
-   **Resolution**: If a divergence is found, a conflict structure containing the key, stored value, proposed value, and priority rating is returned. P0 conflicts block auto-generation, requiring a manual client override.

---

## 4. Transactional Overrides and Cascade Invalidations

When an override is applied, it runs within a database transaction:

1.  **Deactivate Old**: Sets `is_active = False` on the targeted decision log record.
2.  **Create Superseding**: Creates a new `DecisionLog` record with the overridden value, establishing a self-referential link via the `supersedes` FK.
3.  **Traverse Impact**: Uses a BFS graph analyzer to traverse directed dependency edges from the modified root key.
4.  **Cascade Deactivate**: Deactivates all downstream child records (`is_active = False`) to flag them for re-negotiation.

```text
[Change database: PostgreSQL -> MySQL]
            │
            ▼ (Invalidates)
[orm: DjangoORM] ──► (Invalidates) ──► [auth: SimpleJWT]
```
