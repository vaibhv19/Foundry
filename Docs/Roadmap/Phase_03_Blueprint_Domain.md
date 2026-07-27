# Phase 03 — Blueprint Domain & Versioning

## Phase Goal
The objective of this phase is to establish the relational domain model for Foundry's core entities. We will define the database structures for `Idea`, `Blueprint`, `Section`, `Version`, `Job`, `AgentRun`, `AgentMessage`, and `Export` tables. We will also construct the complete REST API to handle CRUD operations, soft deletions, renaming, duplication, version history retrieval, version rollbacks, and file exports.

---

## Folder Structure

```text
backend/
└── foundry_backend/
    ├── urls.py                # Mount blueprints/ sections/ urls
    └── blueprints/            # Django App for Blueprint Domain
        ├── __init__.py
        ├── models.py          # Relational Models
        ├── serializers.py     # DRF Serializers
        ├── views.py           # REST Controllers
        ├── urls.py
        ├── managers.py        # Custom managers for soft delete
        ├── services.py        # Duplication and export logic
        └── tests/
            ├── __init__.py
            ├── test_models.py
            ├── test_views.py
            └── test_services.py
```

---

## Module Definitions

### 1. Blueprint Domain Models
* **Purpose**: Core entity mapping for database persistence.
* **Responsibilities**: Defining columns, foreign keys, table indexes, default choices, and database level constraints.
* **Dependencies**: User Identity Module (from Phase 02).
* **Outputs**: Database tables and migrations.
* **Public Interfaces**: Django Models: `Idea`, `Blueprint`, `Section`, `Version`, `Job`, `AgentRun`, `AgentMessage`, `Export`, `Attachment`.

### 2. Serialization & DTO Layer
* **Purpose**: Converts complex database records into standardized JSON shapes.
* **Responsibilities**: Field validation, formatting ISO-8601 dates, embedding nested lists (e.g. `sections` inside `BlueprintDetail`), and validating status transitions.
* **Dependencies**: Blueprint Domain Models.
* **Public Interfaces**: `BlueprintDetailSerializer`, `VersionSerializer`, `ExportSerializer`.

### 3. REST API Viewsets
* **Purpose**: Handles incoming HTTP requests and executes business services.
* **Responsibilities**: Access control, validation checks, calling duplication/restore subservices, and formatting JSON responses.
* **Dependencies**: Serialization & DTO Layer.
* **Inputs**: Client request context and URL params.
* **Outputs**: HTTP status responses (200, 201, 202, 403, 404).

---

## Table Specifications (Additions / Standardizations)
* **`Blueprint`**: Includes `is_deleted` column to handle soft deletion.
* **`Section`**: Standardizes `category` to ENUM: `MARKET`, `PRODUCT`, `TECH_STACK`, `BUSINESS`.
* **`Version`**: Includes `agent_run_id` (FK to `agent_runs.id`) and `job_id` (FK to `jobs.id`) columns for auditing context.

---

## Atomic Implementation Tasks

### Task 3.1: Implement Idea & Blueprint Models
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 2.3
* **Description**: Create `blueprints` Django app. Define `Idea` model (`raw_text`, `user` FK) and `Blueprint` model (`user` FK, `idea` FK, `title`, `status` choices, `created_at`). Add `is_deleted` boolean field. Create custom Manager (`BlueprintManager`) to filter out soft-deleted items by default (`is_deleted=False`).
* **Definition of Done**: 
  - Models written in `blueprints/models.py`.
  - Custom manager implemented.

### Task 3.2: Implement Section & Version Models
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.1
* **Description**: Define `Section` model (`blueprint` FK, `category` ENUM choices, `sort_order` integer). Define `Version` model (`section` FK, `version_number` integer, `content_markdown` text, `is_active` boolean, `created_at` timestamp). Add audit columns: `agent_run_id` and `job_id` as nullable fields.
* **Definition of Done**:
  - `Section` and `Version` models are declared.
  - Override `save()` method on `Version` to auto-increment `version_number` based on the max `version_number` of existing versions for that section.

### Task 3.3: Implement Runtime & Export Tables
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.2
* **Description**: Define the scheduling and diagnostic logging tables in `blueprints/models.py`:
  - `Job` (Celery job mapping): `id` (UUID PK), `blueprint` FK, `target_section` FK (nullable), `task_type` ENUM, `status` ENUM, `current_node` string, `error_log` text.
  - `AgentRun`: `id` (UUID PK), `blueprint` FK, `job` FK, `run_type` ENUM, `status` ENUM, `started_at`, `finished_at`.
  - `AgentMessage`: `id` (UUID PK), `agent_run` FK, `agent_name` string, `message_type` string, `content` text, `created_at`.
  - `Export`: `id` (UUID PK), `blueprint` FK, `format` ENUM (`MARKDOWN`, `PDF`), `storage_path` text, `created_at`.
* **Definition of Done**: All operational database models are declared.

### Task 3.4: Generate Database Migrations
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.3
* **Description**: Run `python manage.py makemigrations blueprints` and `python manage.py migrate` to create database schema in Postgres.
* **Definition of Done**: Tables are successfully generated in PostgreSQL.

### Task 3.5: Implement Blueprint Serializers
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.4
* **Description**: Write `BlueprintSerializer` (for lists) and `BlueprintDetailSerializer` (for detailed views, nesting active section versions and version counts). Write `SectionSerializer` and `VersionSerializer`.
* **Definition of Done**: Serializers written and validated in DRF shell.

### Task 3.6: Create Blueprint CRUD ViewSet Endpoints
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 3.5
* **Description**: Create `BlueprintViewSet` extending `ModelViewSet`. Implement custom actions:
  - `destroy`: Overrides standard deletion to set `is_deleted = True`.
  - `rename`: Endpoint `/api/v1/blueprints/{id}/rename/` to change the `title`.
  - `duplicate`: Endpoint `/api/v1/blueprints/{id}/duplicate/` that clones the Blueprint and sections, duplicating all active versions into new `Version` records pointing to the new sections, returning the new UUID.
* **Definition of Done**: REST actions return expected structures.

### Task 3.7: Implement Section History and Version Restore Views
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 3.6
* **Description**: Create `SectionViewSet` with custom action `versions` to fetch the history list. Create `VersionViewSet` with action `restore` `/api/v1/versions/{id}/restore/` that sets the target version `is_active=True`, and all other sibling versions for that section `is_active=False`.
* **Definition of Done**: Section history fetched successfully; version rollback works.

### Task 3.8: Develop Mock Export Trigger view
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 3.6
* **Description**: Implement `/api/v1/exports/{id}/trigger/` which fetches active versions of sections, joins them in standard sort order into a markdown document, writes it to a local storage mock path, and writes an `Export` database record, returning download link.
* **Definition of Done**: Mock export triggers and generates a downloadable text file in the media volume.

### Task 3.9: Write Unit and Integration Tests for Blueprint CRUD and Rollbacks
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 3.8
* **Description**: Write tests to assert:
  - Soft deletion excludes blueprints from standard GET index queries.
  - Duplication maintains content copies under independent UUID.
  - Version activation rollback logic disables old active flag and updates current state.
* **Definition of Done**: Tests pass successfully on running `pytest`.

---

## Milestone Verification Checkpoint (Milestone 01-C)
* **Status**: Running suite.
* **Behavior**: Full REST endpoints functional. Users can create blank blueprints, fetch details, soft-delete, duplicate drafts, and toggle section versions.
* **Incomplete Features**: No AI generation logic (Celery tasks are placeholder stubs returning 202).

---

## Suggested Git Commits
- `feat/backend/blueprint-models`: Models definitions and migrations.
- `feat/backend/blueprint-crud`: DRF viewsets, serializers, list and retrieve routing.
- `feat/backend/blueprint-actions`: Soft-deletion, rename, and duplication actions.
- `feat/backend/version-rollback`: History tracking lists and version restoration routes.
- `feat/backend/export-service`: Markdown compilation pipeline.
- `test/backend/blueprint-domain`: API tests validating CRUD, cloning, and rollback states.

---

## Suggested GitHub Issues
* **Issue #1.4**: Define `Blueprint`, `Section`, `Version`, and `Jobs` database models and migrations.
* **Issue #1.5**: Create REST API endpoints for Blueprints and Sections lists and details.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/03_Blueprint_Lifecycle_And_Version_Control.md`**: Document database schema design decisions, soft deletion patterns in Django, and transaction safety during record duplication.
