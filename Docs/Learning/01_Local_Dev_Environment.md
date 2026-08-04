# Local Development Environment Setup

This document details the containerized development architecture, port mappings, volume syncing, and environment configurations for **Foundry**.

## Container Architecture

Foundry orchestrates five core services using Docker Compose:

1.  **`db` (PostgreSQL 15)**: Holds the relational schema for identity, blueprints, sections, and structural decision log history.
2.  **`redis` (Redis 7)**: Acts as the Django Channels channel layer and Celery queue/result backend.
3.  **`backend` (Django REST Framework)**: Exposes port `8000`. Connects to `db` and `redis`.
4.  **`celery` (Celery background worker)**: Processes agent graphs and target section regenerations asynchronously.
5.  **`frontend` (React + Vite)**: Exposes port `5173`. Uses Node 20 Slim.

### Port Mappings & Services

| Service | Internal Port | Host Port | Protocol / Purpose |
| :--- | :--- | :--- | :--- |
| `db` | `5432` | `5432` | PostgreSQL Relational Database |
| `redis` | `6379` | `6379` | Cache, Message Broker, Channels |
| `backend` | `8000` | `8000` | Django HTTP / ASGI |
| `celery` | N/A | N/A | Celery Worker (No exposed ports) |
| `frontend` | `5173` | `5173` | React Dev Server (Vite) |

## Development Volumes

To allow for real-time code changes (HMR in Vite and reload in Django):
-   **Backend / Celery**: Mounts `./backend` into `/app` in the container.
-   **Frontend**: Mounts `./frontend` into `/app` in the container, with an anonymous volume `/app/node_modules` to prevent host OS dependency overrides.

---

## Startup Runbook Sequence (Local Setup Without Docker)

If you are running the service components outside of Docker Compose, you must start services in the following exact sequence:

1. **Redis**: Start Redis server on `localhost:6379` (Redis is required by Daphne channel layers and Celery).
2. **Daphne Backend**: Run database migrations and launch the Django ASGI web server:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```
3. **Celery Worker**: In a new shell terminal, spawn the Celery daemon:
   ```bash
   cd backend
   celery -A foundry_backend worker --loglevel=info
   ```
   > [!IMPORTANT]
   > **Windows OS Platform Warning**
   > Celery on Windows cannot run using the default prefork execution pool. You must explicitly start it with a threads or solo pool parameter:
   > `celery -A foundry_backend worker --loglevel=info -P threads`
4. **Vite Frontend**: Install client packages and run the React app:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Health Validation Steps

To verify that the local dev environment is fully operational:

1.  **Launch the stack**:
    ```bash
    docker-compose up -d --build
    ```
2.  **Check container statuses**:
    ```bash
    docker-compose ps
    ```
    All 5 containers (`foundry_db`, `foundry_redis`, `foundry_backend`, `foundry_celery`, `foundry_frontend`) should list their status as `Up`.
3.  **Verify DB migrations**:
    ```bash
    docker-compose exec backend python manage.py migrate
    ```
4.  **Verify HTTP access**:
    -   Backend landing page: [http://localhost:8000](http://localhost:8000)
    -   Frontend landing page: [http://localhost:5173](http://localhost:5173)
