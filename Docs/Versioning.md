# Versioning — Foundry

Versioning is central to Foundry because the blueprint is not a static artifact. It is a living document that evolves through debate, regeneration, and user review. The system therefore maintains section-level versions rather than treating each change as a full-document overwrite.

---

## 1. Versioning Model

Each section in a blueprint can have many versions.

- The first version is created during initial generation.
- Every regeneration creates a new version for that section.
- Every manual edit can also create a new version if the user accepts the change.

This design allows the user to compare revisions and restore earlier content without losing the blueprint's history.

---

## 2. Version Semantics

A version represents one coherent state of one section.

It includes:
- the section content
- the generation context that produced it
- the decision snapshot used during generation
- the timestamp and source of the change

Versions are not just copies of text. They preserve the reasoning context that made the version valid.

---

## 3. Creation Rules

A new version is created when:
- the initial blueprint is generated
- a targeted regeneration is requested
- a manual override is accepted
- the user restores or re-applies an earlier version

A version only becomes active after the runtime confirms that the section content is complete and the related decisions are consistent.

---

## 4. Active vs Historical Versions

At any one time, one version per section is active.

- The **active version** is the content visible to the user in the canvas.
- **Historical versions** remain stored for inspection, comparison, and rollback.

This distinction keeps the document editing experience simple while preserving the full change history.

---

## 5. Rollback and Restore

Rollback is handled explicitly.

To restore an earlier version:
1. the user selects the target historical version
2. the system marks it as active
3. the prior active version becomes historical
4. the related decision state is re-evaluated if needed

Rollback is especially important when a regeneration introduced a conflict or a change that should not have been committed.

---

## 6. Comparison Model

The document canvas should support lightweight diffing between versions.

The comparison view should show:
- text differences between versions
- the decision changes that occurred between them
- the section-specific rationale that changed

This makes the history understandable to the user rather than feeling like raw audit logs.

---

## 7. Relationship to Decision Memory

Versions and decisions are related but not identical.

- A version is a snapshot of content.
- A decision is a commitment that shaped the content.

A later version may remain valid even if the decision set changes, but the system should clearly show when a version is no longer aligned with the active decision graph.

---

## 8. Related Documents

- [DB_Schema.md](DB_Schema.md)
- [App_Flow.md](App_Flow.md)
- [Decision_Memory_Architecture.md](Decision_Memory_Architecture.md)

---

## 9. Implementation Notes & Deviations

* **Versioning Persistence**: Each section version is persisted as a row in the `Version` model table. The version number auto-increments sequentially per section category.
* **Rollback & Restore Implementation**: Rollbacks are executed via a `POST` request to `/api/v1/versions/{id}/restore/`. The backend `DecisionMemoryEngine.rollback_to_version` method automatically:
  1. Sets all other sibling versions for that section to `is_active = False` and sets the selected version to `is_active = True`.
  2. Deactivates all decisions created after the restored version was created.
  3. Reactivates the historical decisions that were active at the time the restored version was created.
* **Frontend Sync**: When a section's version is restored, the frontend Zustand canvas store triggers a re-fetch of the blueprint details, updating the active text display and synchronizing the Right Rail decision log list.

