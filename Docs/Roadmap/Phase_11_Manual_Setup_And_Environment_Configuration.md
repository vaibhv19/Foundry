# Phase 11 — Manual Setup & Environment Configuration

## Phase Goal
The objective of this phase is to establish a clear, documented setup flow, configure environment templates, and configure a Celery worker service in the Docker orchestration so that a fresh clone of the repository can be brought up and executed without manual troubleshooting.

## Why This Phase Comes Now
Ensuring that local development setups, Docker configurations, and environment variable requirements are fully standardized is critical to making the project maintainable and repeatable for any developer running it from scratch.

---

## Folder Structure
No new folders are added. This phase defines environment template files and orchestrator container configurations.
```text
Foundry/
├── backend/
│   └── .env.example           # [NEW] Environment variables template
├── docker-compose.yml         # [MODIFY] Added celery service configuration
└── Docs/
    └── Roadmap/
        └── Phase_11_Manual_Setup_And_Environment_Configuration.md
```

---

## Module Definitions

### 1. Environment Variable Templates
* **Purpose**: Provides baseline configuration keys and descriptions.
* **Responsibilities**: Define required environment vars for local development and Django environment setups.
* **Dependencies**: None.

### 2. Orchestration Configurations
* **Purpose**: Extends Docker Compose configurations to run Celery automatically.
* **Responsibilities**: Configure a celery worker service running on same Django codebase.
* **Dependencies**: Redis.

---

## Atomic Implementation Tasks

### Task 11.1: Create Backend Env Example Template
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: None
* **Description**: Create a template file at `backend/.env.example` containing placeholders for:
  - `SECRET_KEY` (explanation of Django secret key)
  - `DEBUG` (toggle boolean)
  - `ALLOWED_HOSTS` (comma-separated domains)
  - `DATABASE_URL` (URI string mapping DB connection)
  - `REDIS_URL` (Redis cache link)
  - `GEMINI_API_KEY` (Google AI Studio Key instructions)
  - `GEMINI_DEFAULT_MODEL` (fallback model key)
  - `CELERY_BROKER_URL` (broker URL location)
  - `CELERY_RESULT_BACKEND` (result storage)
  Provide inline comments explaining each variable's role and structure.
* **Definition of Done**: `backend/.env.example` exists in the repository, containing all documented keys and clear explanation comments.

### Task 11.2: Add Celery Worker Service to Docker Compose
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 11.1
* **Description**: Modify `docker-compose.yml` to declare a new `celery` worker service. It should:
  - Build using the same context/Dockerfile as `backend`.
  - Command: `celery -A foundry_backend worker --loglevel=info`
  - Mount backend directories for hot reloading.
  - Inject required variables (`DATABASE_URL`, `REDIS_URL`, `DEBUG`, etc.).
  - Set `depends_on` indicating dependency on `db` and `redis`.
* **Definition of Done**: Running `docker-compose up` automatically brings up the database, redis, daphne backend, React frontend, and a functioning Celery worker capable of processing jobs.

### Task 11.3: Document Windows-Specific Celery Pool Flags
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: None
* **Description**: Add a clear markdown warning or callout explaining that on Windows, Celery workers must be started with `-P threads` or `-P solo` flags to avoid default prefork issues. Place this documentation in `Docs/Learning/01_Local_Dev_Environment.md` and `README.md` at the root, making it highly visible to local developers.
* **Definition of Done**: Windows-specific command flags are documented in both root `README.md` and dev environment guide.

### Task 11.4: Document Exact local startup sequence
* **Size**: S
* **Risk**: Low
* **Prerequisites**: None
* **Description**: Document the repeatable step-by-step local dev startup sequence (Redis first, Daphne second, Celery third) in `Docs/Learning/01_Local_Dev_Environment.md` and `backend/README.md`.
* **Definition of Done**: Dev guides contain the startup runbook outlining process orders.

---

## Phase-Wide Definition of Done
A fresh clone of the repository, configuring settings using only the outputs of this phase (the `.env.example` template and updated `docker-compose.yml`), can be brought up and run successfully without needing manual background execution troubleshooting or guessing setup parameters.

---

## Milestone Verification Checkpoint (Milestone 11)
* **Status**: Complete Environment orchestration.
* **Behavior**: Full local development environment setup is reproducible via single-command launch with clean template variables.
* **Incomplete Features**: Testing audit (handled in Phase 12).

---

## Developer Validation Checklist
- [ ] Backend env example template is written with descriptions.
- [ ] docker-compose.yml configures automated Celery workers.
- [ ] Windows worker flags are documented clearly in READMEs.
- [ ] Exact launch order processes are detailed.

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

* **Suggested Branch Name**: `feat/setup/env-compose`
* **Suggested Merge Point**: `develop`
* **Suggested Tag**: `v1.0.0-phase11`
* **Suggested Commit Grouping**:
  - `feat/setup/env-example`: Create env example template file
  - `feat/setup/docker-celery`: Add Celery worker service to docker compose
  - `docs/setup/guide`: Document Windows pool flags and startup order
