# Foundry — Backend Core

The backend of Foundry is built using Python 3.11 with Django, Django REST Framework (DRF) for APIs, Django Channels (Daphne) for asynchronous WebSockets, Celery for multi-agent background debate runtimes, and PostgreSQL for relational persistence.

---

## Configuration Structures

* **foundry_backend/**: Core setting configurations, ASGI server bindings, routing controllers, and Celery app definitions.
* **users/**: Handles user authentication, token pair generations (SimpleJWT), and tier-based rate limit throttles.
* **blueprints/**: Houses the relational database schemas for Ideas, Blueprints, Canvas Sections, Version histories, and Decision Logs.
* **ai_engine/**: Pluggable abstract client provider interface for Gemini LLM model API stream generators.

---

## Environment Variables Configuration

Copy `backend/.env.example` to `backend/.env` and update the properties:
* `SECRET_KEY`: Random django security key.
* `DEBUG`: Boolean flag (`True` in dev, `False` in prod).
* `DATABASE_URL`: Connection string to PostgreSQL instance (`postgres://user:pass@host:port/db`).
* `REDIS_URL`: Cache and channel layer broker URL (`redis://host:port/db`).
* `GEMINI_API_KEY`: API key for Gemini LLM services (if empty, runs in mock test provider mode).

---

## Local Installation (Without Docker)

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

## Celery Worker Daemon Startup

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

## Local Unit & Integration Testing

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

## Run LangGraph Agents from Django Shell

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
