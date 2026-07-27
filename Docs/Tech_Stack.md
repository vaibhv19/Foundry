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

## 6. Why Not X

- **Not Spring AI / Java for the agent layer**: Foundry is explicitly the Python/Django-track project in the portfolio; keeping the AI layer in Python keeps that resume story clean
- **Not a vector DB**: Decision Memory is retrieval over *this blueprint's own* structured decision log (a handful of rows per blueprint), not semantic search over a large external corpus — a vector store would be solving a problem Foundry doesn't have. That distinction is the same one drawn in the PRD against Phoenix's RAG.

## 7. LLM Provider Abstraction

Foundry uses a provider abstraction so the orchestration layer is not coupled to Gemini in the long term.

- `LLMService` is the application-facing interface for model calls, structured output, streaming, and retry handling.
- `GeminiProvider` is the v1 implementation and is the only provider in the initial build.
- Future providers can be introduced by implementing the same interface and swapping the provider registration in the runtime.

### Service Expectations
- The abstraction supports a streaming interface for real-time token delivery.
- It returns structured output for decision extraction and consistency checks.
- It enforces timeout controls, retry limits, and normalized error handling.
- The runtime can cancel or retry a specific node without disrupting the rest of the blueprint generation flow.
