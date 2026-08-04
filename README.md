# Foundry — Smart Startup Blueprint Generator

Foundry is a portfolio-grade, multi-agent AI web application that automatically generates comprehensive business and technical blueprints for startup ideas. The core generation process runs via a multi-agent debate simulation where specialized agents negotiate and reach consensus on target market parameters, product specification details, technical architecture choices, and financial budgeting.

---

## Key Architectural Concepts

### 1. Multi-Agent Debate Loop
When a user submits a raw startup idea, Foundry launches an asynchronous multi-agent debate orchestrated using LangGraph:
* **Investor (Business Model)**: Analyzes financial viability, market sizing, target customer segmentation, and budget guidelines.
* **Product Manager (Product Specification)**: Designs user journeys, details product features, and lists subscription tiers.
* **Tech Lead (Technical Architecture)**: Formulates system architecture designs, selects technology stacks, databases, and structural models.
* **Consistency Check (Guardrail)**: Evaluates state changes, detects conflicts between new proposals and established decisions, and flags errors.
* **Tie Breaker (Consensus Resolver)**: Resolves persistent disagreements when agents are stuck.

### 2. Decision Memory Engine
Foundry preserves the active design state in a persistent DB-backed Decision Log. When subsequent section rewrites are triggered, the agents must comply with previously agreed decisions. If a user requests a rewrite that directly violates a locked decision (e.g. changing DB to MongoDB when PostgreSQL was locked as a P0 decision), the system flags a **Consistency Conflict** and prompts the user to enter a rationale to proceed with a manual override.

---

## Monorepo Layout

```text
Foundry/
├── README.md                      # Project Root README
├── docker-compose.yml             # Docker Orchestration Configuration
├── e2e/                           # Playwright End-to-End Test Suite
│   ├── playwright.config.js       # Playwright Config
│   ├── specs/                     # E2E Spec Scenarios
│   │   ├── initial_generation.spec.js
│   │   ├── conflict_resolution.spec.js
│   │   └── version_rollback.spec.js
│   └── scripts/                   # Load and stress test scripts
│       └── rate_limit_test.py
├── backend/                       # Django + Channels + Celery Backend
│   ├── manage.py                  # Django CLI entrypoint
│   ├── foundry_backend/           # Settings, WS routing, ASGI/WSGI
│   ├── users/                     # Users, auth, tier rate limiting
│   └── blueprints/                # Blueprints model, canvas sections, exports
├── frontend/                      # React + Vite Frontend
│   ├── src/                       # React Components & Zustand stores
│   └── index.html                 # Frontend index
└── Docs/                          # Comprehensive Technical Deep-Dives
    ├── UI_Design.md               # Visual Identity and Theme documentation
    └── Learning/                  # Living Knowledge Base Deep-Dives
        ├── README.md              # Master Table of Contents
        └── ...                    # Topic-specific architectural logs
```

---

## Local Launch Instructions (Docker Compose)

The entire application runs under a Docker Compose network containing Django (Daphne ASGI), Celery background workers, Redis caches, and a React (Vite) server.

### Prerequisites
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your system.
* A valid Gemini API Key (or the provider will fallback to the local mock mode automatically).

### Step-by-Step Start
1. **Initialize Environment Variables**:
   Copy the backend environment file and configure your API key:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(Ensure `GEMINI_API_KEY` is set to your Gemini API Key. If empty, the system runs in mock mode for offline testing).*

2. **Launch Containers**:
   Build and start the container stack:
   ```bash
   docker-compose up --build
   ```

3. **Verify Access**:
   Once the build completes and services are ready, navigate to:
   * **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   * **Backend REST API**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

---

## Local Development (Native Virtualenv)

If running without Docker, ensure you have Redis installed and running on `127.0.0.1:6379`.

### 1. Backend Server Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Celery Workers Setup
In a new terminal:
```bash
cd backend
source venv/bin/activate  # On Windows use: venv\Scripts\activate
# For Windows developers:
celery -A foundry_backend worker --loglevel=info -P threads
# For Linux/macOS developers:
celery -A foundry_backend worker --loglevel=info
```

### 3. Frontend Dev Server Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
