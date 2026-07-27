# Phase 01 — Project Setup

## Phase Goal
The objective of this phase is to establish the monorepo plumbing, directory layouts, virtual environments, Docker configurations, and base boilerplate projects for both the Django backend and the React frontend. By the end of this phase, the developer should be able to spin up the entire application stack using a single Docker Compose command and run initial health checks.

---

## Folder Structure

Upon completion of this phase, the workspace directory layout must appear as follows:

```text
Foundry/
├── docker-compose.yml
├── .gitignore
├── README.md
├── Docs/
│   └── Roadmap/
│       ├── Roadmap_Index.md
│       └── Phase_01_Project_Setup.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── manage.py
│   └── foundry_backend/
│       ├── __init__.py
│       ├── settings.py
│       ├── urls.py
│       ├── asgi.py
│       └── wsgi.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   └── index.css
    └── public/
```

---

## Module Definitions

### 1. Monorepo Plumbing & Compose Configurations
* **Purpose**: Coordinates Postgres, Redis, Django Channels (Daphne), Celery worker, and Vite React dev server.
* **Responsibilities**: Orchestrating healthchecks, environment variables injection, port mappings, and volume mounts.
* **Dependencies**: Docker Desktop installed locally.
* **Inputs**: `.env` (environment configurations).
* **Outputs**: Isolated, running container suite.

### 2. Django Backend Base
* **Purpose**: Base Django/DRF web application scaffold configured for ASGI and asynchronous extensions.
* **Responsibilities**: Resolving request routing, loading configuration values from environment variables, setting up database connectors, and initializing the logging framework.
* **Dependencies**: Python 3.11+, PostgreSQL, Redis.
* **Public Interfaces**: ASGI runtime entrypoint at `foundry_backend/asgi.py`.

### 3. Vite React Frontend Scaffold
* **Purpose**: Base React development application scaffold.
* **Responsibilities**: Serving static HTML, configuring Vite bundling, and loading baseline styles.
* **Dependencies**: Node.js 18+.

---

## Atomic Implementation Tasks

### Task 1.1: Define Monorepo Base Directories and Gitignore
* **Size**: S
* **Risk**: Low
* **Prerequisites**: None
* **Description**: Create the root directory structures (`backend/`, `frontend/`, `Docs/Learning/`) and populate a comprehensive root-level `.gitignore` that ignores python `__pycache__`, virtual environments, `.env` files, Node `node_modules`, and Vite build outputs.
* **Definition of Done**: 
  - Directory structures are generated.
  - Root `.gitignore` is pushed.
  - git status shows clean tracking exclusion boundaries.

### Task 1.2: Create Docker Compose Orchestrator
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 1.1
* **Description**: Write `docker-compose.yml` in the root workspace. Define three core backing infrastructure services:
  1. `db`: Postgres (image: `postgres:15-alpine`), exposed on port `5432` with healthcheck verifying PG readiness.
  2. `redis`: Redis (image: `redis:7-alpine`), exposed on port `6379`.
* **Definition of Done**:
  - `docker-compose.yml` exists.
  - Running `docker-compose up -d db redis` starts both services.
  - Running `docker-compose ps` shows both services in healthy state.

### Task 1.3: Initialize Django Backend Scaffold
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 1.1
* **Description**: Setup Python environment inside `backend/` folder using Python 3.11+. Create `requirements.txt` listing:
  - `django>=4.2,<5.0`
  - `djangorestframework`
  - `django-environ`
  - `psycopg2-binary`
  - `gunicorn`
  - `uvicorn[standard]`
  Initialize django project named `foundry_backend` inside `backend/`.
* **Definition of Done**:
  - `requirements.txt` populated.
  - Django project runs locally via `python manage.py runserver` inside virtual environment.

### Task 1.4: Initialize React Frontend Scaffold
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 1.1
* **Description**: Navigate to `frontend/` folder. Initialize Vite React project in non-interactive mode using `npx -y create-vite@latest ./ --template react`. Install dependencies:
  - `react`
  - `react-dom`
  Configure `vite.config.js` to expose port `5173`.
* **Definition of Done**:
  - `frontend/package.json` created.
  - Running `npm install` and `npm run dev` starts local development server on port `5173`.

### Task 1.5: Dockerize Backend Service
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 1.2, Task 1.3
* **Description**: Create `backend/Dockerfile` using multi-stage build or standard Python base. Expose port `8000`. Configure backend service in `docker-compose.yml` mounting the code as a volume, configuring environment variables (e.g. `DATABASE_URL`, `REDIS_URL`), and waiting for `db` service healthcheck.
* **Definition of Done**:
  - `backend/Dockerfile` works.
  - Running `docker-compose up backend` runs Gunicorn or development server.
  - Connects to database successfully.

### Task 1.6: Dockerize Frontend Service
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 1.2, Task 1.4
* **Description**: Create `frontend/Dockerfile` using Node alpine image. Expose port `5173`. Configure frontend service in `docker-compose.yml` mounting development volumes.
* **Definition of Done**:
  - `frontend/Dockerfile` works.
  - `docker-compose up frontend` boots Vite server.
  - Landing page is accessible at `http://localhost:5173`.

---

## Milestone Verification Checkpoint (Milestone 01-A)
* **Status**: Running suite.
* **Behavior**: Verify that executing `docker-compose up --build` spins up all 4 containers (db, redis, backend, frontend) without errors.
* **Incomplete Features**: API endpoints do not exist yet; agent runtimes are not defined.

---

## Suggested Git Commits
- `setup/project-skeleton`: Root layout and gitignore.
- `setup/docker-db-redis`: Basic docker-compose file with database and cache storage.
- `setup/backend-scaffold`: Base python/django skeleton.
- `setup/frontend-scaffold`: Base npm/vite react skeleton.
- `setup/docker-integrated`: Unified compose build with running local servers.

---

## Suggested GitHub Issues
* **Issue #1.1**: Initialize monorepo directory structures & configure Docker Compose services.
* **Issue #1.2: scaffold backend**: Initialize python virtualenv, install base packages, create django app structure.
* **Issue #1.3: scaffold frontend**: Initialize React + Vite project and configure ports.
* **Issue #1.4: dockerize services**: Write Dockerfiles for backend and frontend. Connect all modules into `docker-compose.yml`.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/01_Local_Dev_Environment.md`**: Detail local container architecture, port maps, volume syncing, and environment file setups.
