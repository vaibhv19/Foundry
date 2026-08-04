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

---

## 5. Engineering Lessons & Troubleshooting Stories

### 5.1 Cyclic Dependencies & Infinite Traversal Recursing
* **Problem**: In the `DependencyGraphTraverser`, navigating the relationship tree to locate downstream child keys that should be deactivated was vulnerable to infinite execution loops. If a dependency chain contained cyclic links (e.g. key A depends on key B, which depends on key A), the traversal function would run recursively until it crashed with a `RecursionError` or exhausted system memory.
* **Solution**: We implemented the traversal loop using a Breadth-First Search (BFS) combined with an explicit tracking set. The method maintains a `visited = set()` container. When exploring the children of a node, keys are added to `visited`. If a child key is already present in the set, it is skipped, breaking cycles and guaranteeing that the traversal completes in $O(V + E)$ time.

### 5.2 SQLite Transaction Locks in Local Environments
* **Problem**: During local dev testing using default configurations, concurrent API override requests triggered Django database errors: `OperationalError: database is locked`.
* **Why it happened**: SQLite does not support concurrent write transactions and locks the entire database file during writes. Since override tasks execute complex operations (marking parent records, invalidating children, and writing logs), overlapping requests blocked one another.
* **Solution**: We configured the project to use PostgreSQL for both local development and testing environments. PostgreSQL supports fine-grained row-level locking (`SELECT ... FOR UPDATE`) and concurrency, allowing multiple read/write transactions to execute in parallel.

```
