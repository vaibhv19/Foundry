# Foundry — Backend Architecture

The backend of Foundry is built using Python 3.11 with Django, Django REST Framework (DRF) for REST APIs, Django Channels (Daphne) for asynchronous WebSockets, Celery for multi-agent background debate runtimes, and PostgreSQL for relational persistence.

---

## 1. Directory Structure & App Layout

The backend directory contains the following core structures:

```text
backend/
├── manage.py                  # Django CLI entrypoint
├── requirements.txt           # Python dependency specifications
├── pytest.ini                 # Pytest test suite configuration
├── foundry_backend/           # Core Project Configuration
│   ├── settings.py            # Global Django settings configurations
│   ├── urls.py                # Base HTTP REST API routing maps
│   ├── asgi.py                # ASGI Channels routing & middleware stacks
│   ├── wsgi.py                # WSGI Web Server configurations
│   ├── celery.py              # Celery app initialization scripts
│   ├── ai_engine/             # Abstract AI provider integrations
│   │   ├── service.py         # Abstract base class LLMService
│   │   └── providers/         # Gemini concrete client and local mock mode
│   ├── decision_memory/       # Decision Log & Traversal Engines
│   │   ├── engine.py          # State retrieval, overrides, and rollback logic
│   │   ├── conflict.py        # Relational check rules comparing decisions
│   │   └── graph.py           # DependencyGraphTraverser BFS cycle checker
│   └── strategy_room/         # LangGraph agents orchestration nodes
│       ├── runner.py          # Orchestrates LangGraph execution loop
│       ├── tasks.py           # Background Celery task worker handlers
│       ├── routing_rules.py   # Category-specific subsequence paths
│       ├── consumers.py       # StrategyConsumer WebSocket ASGI endpoints
│       └── prompts.py         # Personas prompts string constants (Investor, PM, Tech Lead)
├── users/                     # Identity & Custom User Operations
│   ├── models.py              # CustomUser definition & UserTiers
│   ├── views.py               # Subclassed TokenObtainPairView auth APIs
│   └── throttling.py          # Redis-backed TierBasedRateThrottle middleware
└── blueprints/                # Core Blueprints, Sections, and Versions
    ├── models.py              # Blueprint, Section, Version, Job, Event schemas
    ├── views.py               # Blueprints ViewSet endpoints (duplicate, override, restore)
    └── serializers.py         # Relational detail data serialization structures
```

---

## 2. Core Service Dependencies

1. **Daphne (ASGI)**: Runs on port `8000`. Acts as the web server coordinating standard REST requests and routing active WebSocket connection upgrades.
2. **Celery Worker**: Evaluates LangGraph state chains offline. Communicates status/token broadcasts via Redis Pub/Sub groups to Daphne socket handlers.
3. **Redis Broker**: Serves as the database queue message broker (Celery) and the Channels backplane (`channels-redis`) for real-time pub/sub group communication.
4. **PostgreSQL**: Serves as the relational storage layer tracking users, ideas, blueprints, version revisions, and active decisions.

---

## 3. Environment Variables Configuration

Copy `backend/.env.example` to `backend/.env` and update the properties:
* `SECRET_KEY`: Random django security key.
* `DEBUG`: Boolean flag (`True` in dev, `False` in prod).
* `DATABASE_URL`: Connection string to PostgreSQL instance (`postgres://user:pass@host:port/db`).
* `REDIS_URL`: Cache and channel layer broker URL (`redis://host:port/db`).
* `GEMINI_API_KEY`: API key for Gemini LLM services (if empty, runs in mock test provider mode).

---

## 4. Local Installation (Without Docker)

1. **Create Python virtualenv**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Database migrations**:
   Ensure PostgreSQL is running, then run:
   ```bash
   python manage.py migrate
   ```

4. **Launch Daphne ASGI server**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

---

## 5. Celery Worker Daemon Startup

Celery is responsible for executing the LangGraph multi-agent debate loop asynchronously. Ensure Redis is running on port 6379 first.

* **On Linux / macOS**:
  ```bash
  celery -A foundry_backend worker --loglevel=info
  ```

* **On Windows**:
  Celery does not natively support default fork worker pools on Windows. Start the worker using the threads or solo pool runner:
  ```bash
  celery -A foundry_backend worker --loglevel=info -P threads
  ```

---

## 6. Local Unit & Integration Testing

We use `pytest` combined with `pytest-django` for executing tests.

* **Run all tests**:
  ```bash
  pytest
  ```

* **Run specific test file**:
  ```bash
  pytest blueprints/tests/test_views.py
  ```

* **Run tests with print logs**:
  ```bash
  pytest -s
  ```

---

## 7. Interactive Backend Inspection

You can execute debate loops or test agent outputs directly from the interactive Django shell:

1. **Open Django Shell**:
   ```bash
   python manage.py shell
   ```

2. **Run LangGraph Invocation**:
   ```python
   from blueprints.models import Blueprint
   from foundry_backend.strategy_room.runner import GraphRunner
   
   # Fetch a test blueprint (substituting with a valid UUID in your DB)
   blueprint_id = "your-blueprint-uuid-here"
   
   # Execute the compiled multi-agent debate graph synchronously
   final_state = GraphRunner.run_initial_debate(blueprint_id)
   print("Debate Finished!")
   print("Final constraints: ", final_state.get("constraints"))
   ```
