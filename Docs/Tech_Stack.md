# Foundry — Tech Stack

## 1. Backend — Django

- **Framework**: Django + Django REST Framework for standard CRUD (auth, blueprints, sections, exports)
- **Async task queue**: Celery + Redis (broker + result backend) — runs the multi-agent debate off the request thread, since a full debate takes real wall-clock time
- **Real-time layer**: Django Channels (ASGI) — streams tokens to the client as they're generated and pushes blueprint lifecycle transitions (`DRAFT → QUEUED → GENERATING → PARTIALLY_GENERATED → READY → EDITING → EXPORTING → ARCHIVED → FAILED → DELETED`)
- **Auth**: Django's built-in auth + DRF token or JWT (simple session/token auth is enough; this isn't the project meant to showcase auth depth — that's [[Trajectory]]'s job)
- **DB**: PostgreSQL — relational fit for `Idea → Blueprint → Sections → Versions` plus the decision log table, which is itself relational (decision → blueprint → section it applies to)

## 2. AI / Agent Layer — Python

- **Orchestration**: LangGraph, modeling the debate as an explicit state graph rather than a chain of prompt strings:
  - `Investor` → `Product Manager` → `Tech Lead` → `Consistency Check`, repeating until convergence or the configured iteration limit, then applying a tie-break if needed
  - The Consistency Check node is where Decision Memory retrieval happens — it's a first-class graph node, not something bolted onto a prompt template
- **LLM provider**: `LLMService` is the application-facing abstraction; `GeminiProvider` is the v1 implementation, and future providers can implement the same interface without changing the graph orchestration
- **Streaming**: LangGraph node output streamed token-by-token, forwarded to the client through the Channels consumer

## 3. Frontend — React

- **Framework**: React (Vite), matching Phoenix's frontend setup
- **State**: local component state + a lightweight store (Zustand, same as Phoenix) for the live-streaming debate state and canvas edits
- **Streaming client**: native WebSocket client consuming the Channels stream, rendering tokens as they arrive
- **Canvas**: the Interactive Document Canvas is the one genuinely custom UI piece — likely a rich-text/block editor (e.g. Tiptap) rather than a plain textarea, so users can select a paragraph and trigger a targeted rewrite

## 4. Infrastructure — Local Only

- **Docker Compose**: Postgres, Redis, Django (ASGI via Daphne/Uvicorn), Celery worker, React dev server — no cloud deployment target, matching Phoenix's scope decision
- No CI/CD pipeline beyond what's needed to prove tests pass locally; this project doesn't aim to showcase deployment ops

## 5. Testing

- Django: pytest + pytest-django for models, decision-log retrieval logic, and Celery task behavior
- Agent layer: deterministic tests against the graph structure (mocked LLM responses) rather than testing real model output — the thing worth testing is "does the Consistency Check node actually retrieve and inject the right decisions," not "does the LLM write good copy"

## 6. Engineering Rationale & Alternatives Considered

### 6.1 Stateless JWT Authentication (SimpleJWT)
* **Choice**: JSON Web Tokens (JWT) via `django-rest-framework-simplejwt`.
* **Rationale**: Traditional Django session-based authentication relies on cookie headers and database session lookups. Because Foundry requires real-time streaming over WebSockets, the authentication mechanism must span both stateless HTTP requests and stateful TCP connections (Django Channels).
* **Protocol Alignment**: Passing the JWT access token in the WebSocket handshake query parameters (`ws://.../?token=<token>`) allows the custom Channels auth middleware to decode and verify the user identity in memory synchronously, avoiding database bottlenecks during TCP establishment.
* **Trade-off**: Revocation is harder with stateless tokens. However, for a single-user portfolio system, short-lived access tokens (5 minutes) combined with refresh tokens represent an optimal security/performance trade-off.

### 6.2 Asynchronous Tasks (Celery + Redis)
* **Choice**: Celery background workers with Redis as the broker and results backend.
* **Rationale**: Multi-agent debates involving three LLM calls, structured parsers, and consistency checks can take up to 30 seconds of wall-clock time. Blocking Django's ASGI request threads during this cycle would quickly exhaust worker capacity, leading to severe latency or gateway timeouts.
* **Orchestration**: Pushing the debate to Celery allows Django to return a `202 Accepted` response immediately. The client establishes a WebSocket connection to monitor progress, and the Celery worker pushes logs and generated tokens asynchronously back to Redis, which Django Channels broadcasts to the client.

### 6.3 Relational Decision Log (PostgreSQL) vs. Vector DB
* **Choice**: Storing structured decisions inside PostgreSQL (`decision_log`) instead of a Vector DB (e.g. pgvector, Pinecone).
* **Rationale**: General RAG systems (like Phoenix) query vector stores via semantic similarity to retrieve relevant document chunks. In contrast, Foundry's Decision Memory Engine solves a **consistency problem**. 
* **Precision**: The system must enforce exact constraints (e.g., if a previous section locked the database engine to `PostgreSQL`, the next rewrite must explicitly know this). Relational query filters (`WHERE blueprint_id = X AND is_active = TRUE`) are 100% deterministic, faster, and cheaper than vector searches, and completely eliminate semantic boundary hallucinations.

### 6.4 Custom Block React Workspace vs. Rich Text Editors (Tiptap / Draft.js)
* **Choice**: Modular React grid layout (`CanvasGrid.jsx` and `SectionBlock.jsx`) backed by individual `Section` records in the database.
* **Rationale**: Rich-text frameworks like Tiptap are designed for editing flat documents. Dividing a blueprint into distinct semantic containers (Market, Product, Tech Stack, Business) allows the system to:
  1. Trigger targeted agent regenerations on a single section without parsing document boundaries.
  2. Maintain independent, auto-incrementing version numbers per section.
  3. Swap or rollback specific sections (e.g., restoring Technical Architecture to `v1` while keeping Product Strategy at `v3`).

---

## 7. LLM Provider Abstraction & Testing Mock Mode

Foundry uses a provider abstraction so the orchestration layer is decoupled from specific LLM vendors.

* **`LLMService` Interface**: Declares standard methods for text generation, streaming, token counting, and structured JSON generation (backed by Pydantic models).
* **`GeminiProvider`**: The primary implementation, mapping application requests to the `google-generativeai` SDK targeting `gemini-1.5-flash`.
* **Testing Fallback (Mock Mode)**: To enable fully offline local development, fast unit tests, and Playwright E2E suites, the provider evaluates the configured `GEMINI_API_KEY`. If the key is empty or a placeholder prefix (e.g. `AQ.`), the provider switches to local mock mode:
  - Streams pre-defined markdown paragraphs to mimic debate iterations.
  - Formats Pydantic JSON structures on demand (e.g. producing valid conflict responses).
  - Detects specific prompt tokens (such as `"mongodb"`) to trigger simulated database conflicts.

---

## 8. Implemented Libraries & Configurations

* **Frontend**: Zustand (`^5.0.14`) for client-side state management, Lucide React (`^1.28.0`) for iconography, Axios (`^1.19.0`) for REST requests, React Router DOM (`^7.18.2`) for routes.
* **Backend**: Django (`4.2.30`), Django REST Framework (`3.14.0`), django-channels (`4.0.0`) with `channels-redis` (`4.1.0`), celery (`5.3.6`), langchain-core / langgraph (`0.1`), pydantic (`v2`).
* **Environment variables**: Configured in monorepo `.env` files (e.g., `GEMINI_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `VITE_API_URL`, `VITE_WS_URL`).


