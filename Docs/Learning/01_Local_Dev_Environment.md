# Local Development Environment Setup

This document details the containerized development architecture, port mappings, volume syncing, and environment configurations for **Foundry**.

## Container Architecture

Foundry is orchestrating four core services using Docker Compose:

1.  **`db` (PostgreSQL 15)**: Holds the relational schema for identity, blueprints, sections, and structural decision log history.
2.  **`redis` (Redis 7)**: Acts as the Django Channels channel layer and Celery queue/result backend.
3.  **`backend` (Django REST Framework)**: Exposes port `8000`. Connects to `db` and `redis`.
4.  **`frontend` (React + Vite)**: Exposes port `5173`. Uses Node 20 Slim.

### Port Mappings & Services

| Service | Internal Port | Host Port | Protocol / Purpose |
| :--- | :--- | :--- | :--- |
| `db` | `5432` | `5432` | PostgreSQL Relational Database |
| `redis` | `6379` | `6379` | Cache, Message Broker, Channels |
| `backend` | `8000` | `8000` | Django HTTP / ASGI |
| `frontend` | `5173` | `5173` | React Dev Server (Vite) |

## Development Volumes

To allow for real-time code changes (HMR in Vite and reload in Django):
-   **Backend**: Mounts `./backend` into `/app` in the container.
-   **Frontend**: Mounts `./frontend` into `/app` in the container, with an anonymous volume `/app/node_modules` to prevent host OS dependency overrides.

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
    All 4 containers should list their status as `Up`.
3.  **Verify DB migrations**:
    ```bash
    docker-compose exec backend python manage.py migrate
    ```
4.  **Verify HTTP access**:
    -   Backend landing page: [http://localhost:8000](http://localhost:8000)
    -   Frontend landing page: [http://localhost:5173](http://localhost:5173)
