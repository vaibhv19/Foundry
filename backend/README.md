# Foundry Backend

Django REST Framework backend running Daphne ASGI and Celery background task processing.

## Local Development Quickstart

### Prerequisites
- Python 3.11+
- Redis (must be running on `localhost:6379`)
- PostgreSQL (or fallback SQLite database)

### Setup Steps
1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables:
   Copy `.env.example` to `.env` and set your API keys:
   ```bash
   cp .env.example .env
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```

---

## Local Runtime Launch Sequence

To run backend services locally, you must launch processes in the following sequence:

### 1. Redis
Verify Redis is running on port 6379.

### 2. Daphne ASGI Web Server
Start the Django ASGI server to support Channels WebSockets and REST endpoints:
```bash
python manage.py runserver 0.0.0.0:8000
```

### 3. Celery Background Worker
In a separate terminal, launch the Celery background worker to process agent graph debate workflows:
```bash
celery -A foundry_backend worker --loglevel=info
```
> [!IMPORTANT]
> **Windows Platform Override**
> Celery on Windows cannot run using the default prefork pool. You must explicitly start it with a threads or solo pool parameter:
> `celery -A foundry_backend worker --loglevel=info -P threads`

---

## Running Tests
Run unit and integration tests using pytest:
```bash
pytest
```
