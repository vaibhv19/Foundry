# Phase 07 — Streaming Runtime

## Phase Goal
The objective of this phase is to construct the real-time event streaming network. We will integrate Django Channels (ASGI), build custom token authentication middleware for WebSocket connections, implement the `StrategyRoomConsumer` to process client-side actions and route messages, write Celery background tasks to execute the LangGraph debate off the request thread, and wire the Celery-to-Channels publisher to broadcast live token streams.

---

## Folder Structure

```text
backend/
├── requirements.txt           # Added channels, channels_redis, celery
└── foundry_backend/
    ├── celery.py              # Celery client configs
    ├── asgi.py                # ASGI routing configuration
    ├── settings.py            # ASGI, Channels, and Celery settings
    ├── urls.py
    └── strategy_room/
        ├── routing.py         # WebSocket URL routes
        ├── consumers.py       # StrategyRoomConsumer class
        ├── middleware.py      # Custom WebSocket JWT auth middleware
        ├── tasks.py           # Celery tasks (run_strategy_debate)
        ├── publisher.py       # Channels Layer event dispatcher
        └── tests/
            ├── test_consumers.py
            └── test_tasks.py
```

---

## Module Definitions

### 1. ASGI WebSockets Gateway
* **Purpose**: Coordinates persistent, low-latency client-server channels.
* **Responsibilities**: Accepting client socket requests, routing them based on URL patterns, checking auth parameters, and managing Redis group subscriptions.
* **Dependencies**: `channels`, `channels_redis`, Redis container running.
* **Inputs**: Client WebSocket frames.
* **Outputs**: Server WebSocket events.
* **Public Interfaces**: Endpoint `ws://localhost:8000/ws/strategy/{blueprint_id}/`.

### 2. Custom Token Auth Middleware (`JWTAuthMiddleware`)
* **Purpose**: Decodes and verifies client session scopes.
* **Responsibilities**: Reading token parameters from incoming connection query strings (`?token=<jwt_jwt>`), validating keys via SimpleJWT, fetching database user records, and populating the connection scope dictionary (`scope['user']`).
* **Dependencies**: `SimpleJWT`, User Identity Module.
* **Outputs**: Sets `scope['user']` with authenticated user model instance, or closes connection if validation fails.

### 3. Celery Agent Task Worker
* **Purpose**: Executes the long-running multi-agent debate.
* **Responsibilities**: Initiating the LangGraph, running the nodes in sequence, catching runtime errors, and saving final documents.
* **Dependencies**: `celery`, Redis container.
* **Inputs**: `blueprint_id` (UUID).
* **Outputs**: Celery task results, database logs.
* **Public Interfaces**: Celery task `run_strategy_debate.delay(blueprint_id)`.

### 4. Channels Event Publisher
* **Purpose**: Bridges background Celery worker threads with the active Channels ASGI server.
* **Responsibilities**: Packaging node execution statuses and streaming tokens, and dispatching them via the Channels channel layer group publish functions.
* **Dependencies**: Redis Channel Layer.
* **Inputs**: Event payloads (`TOKEN`, `STATUS`, `COMPLETE`, `ERROR`).
* **Outputs**: Broadcasts messages to all connected listeners in the blueprint channel group.

---

## Event Payload Formats (Recall)
* Refer to [WebSocket_Protocol.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/WebSocket_Protocol.md) for full schemas of `JOB_CREATED`, `NODE_STARTED`, `TOKEN`, `STATUS`, `COMPLETE`, and `ERROR` events.

---

## Atomic Implementation Tasks

### Task 7.1: Add Channels and Celery Dependencies
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 5.1
* **Description**: Add `channels`, `channels_redis`, and `celery` packages to the `backend/requirements.txt` file and run installation.
* **Definition of Done**: Packages are imported successfully in django processes.

### Task 7.2: Configure Celery client
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 7.1
* **Description**: Create `foundry_backend/celery.py`. Configure Celery settings in `settings.py` pointing to Redis broker (`redis://redis:6379/0`) and result backend (`redis://redis:6379/1`). Update `__init__.py` to load Celery app on start.
* **Definition of Done**: Running command `celery -A foundry_backend worker` initializes the worker daemon successfully.

### Task 7.3: Create ASGI Configuration Router
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 7.1
* **Description**: Update `foundry_backend/asgi.py`. Wrap standard ASGI application with `ProtocolTypeRouter` and `URLRouter` loading routes from `strategy_room/routing.py`. Update settings to define `ASGI_APPLICATION = 'foundry_backend.asgi.application'` and Channel Layer backing configs using Redis.
* **Definition of Done**: Running ASGI server Daphne locally handles HTTP requests.

### Task 7.4: Implement Custom JWT Query String Auth Middleware
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 7.3, Task 2.4
* **Description**: Write `JWTAuthMiddleware` class in `strategy_room/middleware.py`. Extends `BaseMiddleware`. Intercepts incoming connection request `scope['query_string']`. Parse `token` query key, decode JWT using Django SimpleJWT settings, fetch `CustomUser` database record, and inject into `scope['user']`.
* **Definition of Done**: WebSocket connection validates token and rejects unauthorized attempts.

### Task 7.5: Implement Strategy Room Consumer
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 7.4
* **Description**: Implement `StrategyRoomConsumer` inheriting from Channels `AsyncJsonWebsocketConsumer`. On connection:
  - Check permission (user must own the blueprint).
  - Add consumer channel to group `strategy_{blueprint_id}`.
  - Support handling client commands: `resume_generation`, `cancel_generation`, `request_state`.
* **Definition of Done**: Sockets connect, join Redis groups, and route JSON messages.

### Task 7.6: Create Event Publisher Utility
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 7.5
* **Description**: Write event publisher helper functions in `strategy_room/publisher.py`. Uses `asgiref.sync.async_to_sync` on channel layer group send commands. Wraps event creation to standardize envelopes.
* **Definition of Done**: Call `publish_event(blueprint_id, 'TOKEN', payload)` dispatches correct payload structure to Channels group.

### Task 7.7: Wire Event Publishing into LangGraph Node Execution
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 7.6, Task 5.9
* **Description**: Modify LangGraph node execution loops inside nodes:
  - At the start of a node, publish `NODE_STARTED`.
  - While reading LLM output generator, publish `TOKEN` for each chunk received from `GeminiProvider`.
  - At completion of a node, publish `NODE_COMPLETED`.
  - If a node throws an exception, publish `NODE_FAILED` or `ERROR`.
* **Definition of Done**: Running a mock graph sends sequential WebSocket events to the Channel Layer group.

### Task 7.8: Implement Async Celery Debate Task
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 7.7, Task 7.2
* **Description**: Implement Celery task `run_strategy_debate(blueprint_id)` in `strategy_room/tasks.py`. Steps:
  - Update `Blueprint.status = GENERATING`.
  - Publish `STATUS` ("Debate has started").
  - Run the Compiled LangGraph using `GraphRunner`.
  - On convergence, save generated output sections and extracted decisions in PostgreSQL, setting `Blueprint.status = READY`.
  - Publish `COMPLETE` event.
  - Handle exceptions: set status `FAILED`, serialize traceback to `jobs.error_log`, and publish `ERROR` event.
* **Definition of Done**: Celery task executes and updates models and channels in real-time.

### Task 7.9: Write WebSocket and Celery Integration Tests
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 7.8
* **Description**: Write test cases:
  - Use Channels `WebsocketCommunicator` to connect, send auth, and assert messages.
  - Run the Celery task synchronously and verify that the database models transition status correctly and mock socket messages are broadcast in sequence.
* **Definition of Done**: Pytest suite runs and verifies WebSocket connections and task execution.

---

## Milestone Verification Checkpoint (Milestone 03-B)
* **Status**: Running suite.
* **Behavior**: Triggering a blueprint generation schedules a Celery task. Sockets connected to Daphne client receive real-time updates and token streams.
* **Incomplete Features**: Targeted section-level regeneration.

---

## Suggested Git Commits
- `feat/backend/celery-setup`: Celery configurations and settings.
- `feat/backend/asgi-channels`: Channels protocol setup and Daphne configuration.
- `feat/backend/ws-auth`: JWT Query String authentication middleware.
- `feat/backend/ws-consumer`: WebSocket consumer group management.
- `feat/backend/ws-publisher`: Celery-to-Channels event dispatcher.
- `feat/backend/celery-task`: Debate background worker task.
- `test/backend/ws-streaming`: Consumer and Celery test suite.

---

## Suggested GitHub Issues
* **Issue #3.3**: Set up Django Channels routing and WebSocket connection token middleware.
* **Issue #3.4**: Develop Strategy Room WebSocket Consumer to publish streaming tokens.
* **Issue #3.5**: Wrap LangGraph execution inside Celery background tasks.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/07_WebSockets_And_Async_Streaming.md`**: Detail Channels ASGI integration, custom token authorization, and Redis cluster backings.
