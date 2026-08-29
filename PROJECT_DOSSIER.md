# Foundry

## 1. Project Overview
Foundry is an AI-powered startup blueprint generator and multi-agent consensus engine. Given a raw startup concept, Foundry orchestrates a debate loop between three specialized personas—an Investor, a Product Manager, and a Technical Lead—to negotiate business viability, product specifications, and architecture decisions. To avoid the hallucination and consistency drift common to multi-turn LLM pipelines, Foundry implements an explicit **Decision Memory Engine** that extracts structured design commitments into a relational database, tracks cross-domain dependency graphs, detects inter-agent contradictions, and supports targeted section regeneration with historical version rollbacks.

The system is architected as a decoupled monorepo featuring a Django/Django REST Framework + Django Channels ASGI backend, Celery task workers with Redis broker/caching, LangGraph multi-agent execution graphs, Google Gemini LLM provider integrations via Tenacity exponential retry pipelines, a React 19 / Vite single-page application with Zustand state management, and an end-to-end Playwright test suite.

---

## 2. Why I Built It
Standard single-prompt LLM generation for complex project proposals tends to yield generic, superficial, or internally contradictory specifications (e.g., specifying a real-time multiplayer architecture while calculating server costs based on a static monthly batch budget). 

I built Foundry to explore:
1. How multi-agent state machines can model adversarial tension and domain-specific specialization (e.g., an Investor challenging a PM's bloated scope, or a Tech Lead grounding budget constraints).
2. How to build deterministic state management and constraint tracking on top of non-deterministic LLMs.
3. How to allow users to selectively edit, override, or roll back individual sections of an AI-generated document without causing cascading inconsistencies across other sections.

---

## 3. Problem / Question
When multiple LLM agents collaborate to produce a technical and business document:
- **The Consistency Drift Problem**: When an agent in turn 3 proposes a choice (e.g., choosing WebSockets for live bidding), how do we ensure that agent in turn 10 does not propose an incompatible choice (e.g., choosing a serverless architecture that cannot maintain persistent TCP socket state) without bloating context windows with raw transcript dumps?
- **The Targeted Regeneration Problem**: If a user modifies or regenerates only the "Technical Architecture" section, how does the system selectively execute only the necessary sub-graph of agents while preserving immutable upstream constraints from the "Business Model" and "Product Specification" sections?
- **The Real-Time Visibility Problem**: How can long-running multi-stage AI reasoning loops (>15–30 seconds) stream incremental token outputs and intermediate node lifecycle events to a web interface over a unified asynchronous transport without blocking backend web workers?

---

## 4. What It Actually Does
1. **Concept Ingestion**: Accepts a raw startup concept from an authenticated user and queues an initial debate job.
2. **Multi-Agent Consensus Loop**:
   - **Investor Node**: Evaluates monetization models, target market segments, unit economics, and operational constraints.
   - **Product Manager Node**: Outlines core user journeys, functional feature scopes, and operational milestones within the investor's constraints.
   - **Tech Lead Node**: Designs system architecture, selects tech stacks, and flags engineering bottlenecks.
   - **Consistency Check Node**: Evaluates agent outputs against active decision commitments using structured Pydantic extraction.
   - **Tie Breaker Node**: Intervenes if conflicts remain unresolved after 5 iterations to force consensus.
3. **Structured Decision Extraction & Graph Traversal**: Automatically parses durable design choices from agent prose and writes them to a relational `decision_log` table with dependency edges (`decision_dependencies`).
4. **Targeted Section Regeneration**: Allows users to provide rewrite instructions for a specific section (e.g., Market, Product, Tech Stack, Business). The system runs an `AgentRouter` to execute only relevant agent sub-sequences while injecting existing active decisions as immutable constraints.
5. **Conflict Detection & Interactive Overrides**: If a proposed section edit contradicts active cross-section decisions, the UI triggers a conflict alert. Users can manually override decisions, automatically deactivating downstream dependent choices.
6. **Version History & Point-in-Time Rollback**: Maintains an auto-incrementing immutable version history per section. Rolling back to a historical section version reactivates the decision snapshot that was active at that exact timestamp.
7. **Real-Time Streaming**: Streams agent reasoning tokens and lifecycle state events (`NODE_STARTED`, `TOKEN`, `NODE_COMPLETED`, `CONFLICT_DETECTED`, `COMPLETE`) over authenticated WebSockets.
8. **Document Export**: Compiles active section versions into Markdown documents ready for download.

---

## 5. Architecture

```
                                  +---------------------------------------+
                                  |         React 19 Frontend (SPA)       |
                                  |   (Zustand Stores, Mission Control)   |
                                  +-------------------+-------------------+
                                                      |
                                      REST API (JWT)  |  WebSocket (ASGI)
                                                      v
                                  +---------------------------------------+
                                  |       Django ASGI / Daphne Server     |
                                  | (URL Router, JWT Auth Middleware)     |
                                  +---------+-------------------+---------+
                                            |                   |
                     HTTP Request / Response|                   | Channel Layer (Redis)
                                            v                   v
                               +-------------------+    +--------------------+
                               | DRF ViewSets /    |    | Django Channels    |
                               | Model Endpoints   |    | Strategy Consumer  |
                               +---------+---------+    +---------+----------+
                                         |                        |
                                         | Task Dispatch (.delay) | Event Broadcast
                                         v                        |
                               +-------------------+              |
                               |   Celery Worker   | <------------+
                               +---------+---------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-----------------------------+                     +-----------------------------+
|    LangGraph Strategy Room  |                     |    Decision Memory Engine   |
| - Investor Node             |                     | - Pydantic JSON Extractor   |
| - Product Manager Node      | <=================> | - Conflict Detector         |
| - Tech Lead Node            |    Context / State  | - Dependency Graph          |
| - Consistency Check Node    |                     | - Version Rollback Engine   |
| - Tie Breaker Node          |                     +--------------+--------------+
+--------------+--------------+                                    |
               |                                                   |
               v                                                   v
+-----------------------------+                     +-----------------------------+
|     Gemini Provider LLM     |                     |    PostgreSQL Database      |
| - Tenacity Retry / Backoff  |                     | - CustomUser / Tier Throttling
| - Streaming & Structured    |                     | - Blueprints / Sections     |
+-----------------------------+                     | - Versions / Decision Logs  |
                                                    +-----------------------------+
```

### Backend Components
- **Framework**: Django 4.2 LTS, Django REST Framework, Django Channels (ASGI), Daphne.
- **Async Workers & Broker**: Celery 5.6 with Redis 7 as message broker and channel layer.
- **Orchestration**: LangGraph `StateGraph` managing persona node execution, conditional edges, and iteration thresholds.
- **AI Service Layer**: `LLMService` abstract base class with `GeminiProvider` implementation supporting text generation, token streaming (`generate_stream`), and schema-constrained JSON generation (`generate_structured` via Pydantic).
- **Authentication & Throttling**: Custom user model (`CustomUser`) keyed on email with JWT authentication (`djangorestframework-simplejwt`) and sliding-window Redis rate-limiting (`TierBasedRateThrottle`).

### Frontend Components
- **Framework**: React 19, Vite, React Router DOM v7.
- **State Management**: Zustand stores decoupled by domain:
  - `authStore`: Token storage, user identity, login/registration lifecycle.
  - `blueprintStore`: Blueprint metadata, section lists, active version payloads.
  - `canvasStore`: Active section selection, conflict alerts, version restoration, and rewrite triggers.
  - `strategyStore`: Real-time WebSocket connection state, agent node statuses (`idle`, `thinking`), live token log streams, and convergence progress.
- **Design System**: Vanilla CSS with custom tokens in `index.css` following a Slate/Cyan/Gold design palette, responsive flex/grid layouts, and thinking pulse micro-animations.

---

## 6. Important Technical Decisions

1. **State Machine Graph over Monolithic Prompting**:
   - *Decision*: Used LangGraph to break generation into specialized persona nodes (`Investor`, `Product_Manager`, `Tech_Lead`, `Consistency_Check`, `Tie_Breaker`) rather than executing a single multi-persona system prompt.
   - *Trade-off*: Increased orchestration latency and API calls in exchange for clear domain boundaries, verifiable node-by-node execution logs, and targeted re-execution capabilities.

2. **Structured Decision Extraction vs. Full Context Injection**:
   - *Decision*: Extracted durable commitments into a relational `DecisionLog` table and injected only key-value decision summaries into agent prompts rather than passing entire conversational histories.
   - *Trade-off*: Requires an additional structured extraction LLM pass on every generated section, but prevents prompt bloat, keeps token costs bounded, and enables algorithmic conflict detection.

3. **Decoupled Celery Background Tasks with WebSocket Event Streaming**:
   - *Decision*: Bound long-running LLM generation and regeneration cycles to Celery worker tasks while pushing token-by-token chunks to frontend clients via Django Channels Redis groups.
   - *Trade-off*: Required writing a custom ASGI JWT query-parameter middleware (`JWTAuthMiddleware`) and handling dual persistence (database records + real-time stream events), but guaranteed that web request threads are never blocked by LLM response latency.

4. **Point-in-Time Version Rollbacks with Temporal Decision Reactivation**:
   - *Decision*: When restoring a historical section version, the `DecisionMemoryEngine` deactivates decisions created after that version's timestamp and reactivates decisions that were active at that exact timestamp (verifying whether they had been superseded prior to that timestamp).
   - *Trade-off*: Requires querying historical creation timestamps and traversal of `supersedes` foreign keys, but guarantees complete mathematical consistency between document text and decision state.

5. **Tier-Based Sliding Redis Throttling**:
   - *Decision*: Implemented custom `TierBasedRateThrottle` using Redis cache keys formatted by user ID and epoch-minute timestamps (`throttle_<user_id>_<minute_timestamp>`) with tier-specific ceilings (Free: 10 req/min, Premium: 100 req/min).
   - *Trade-off*: Introduces Redis dependency for rate limiting, but prevents API abuse and guarantees stateless rate tracking across multi-worker deployments.

---

## 7. Interesting Engineering Problems

### 1. The Multi-Agent Negotiation & Convergence Loop
- **Problem**: When multiple personas debate, they can easily enter infinite feedback loops (e.g., Tech Lead objecting to Investor budget constraints indefinitely).
- **Solution**: Implemented a conditional routing function (`route_after_consistency`) in LangGraph. The `Consistency_Check` node analyzes active and pending decisions via structured schema. If conflicts exist and `iteration_count < 5`, it loops back to the persona agents. If `iteration_count >= 5`, the state machine routes to a dedicated `Tie_Breaker` node that makes authoritative compromises and forces termination to `END`.

### 2. Algorithmic Conflict Detection vs. LLM Non-Determinism
- **Problem**: Natural language assertions make detecting direct contradictions difficult without running expensive, non-deterministic cross-comparison prompts every turn.
- **Solution**: Standardized extraction through Pydantic schemas (`DecisionExtractionResult`, `DecisionItem`) with strict keys and enum categories (`MARKET`, `PRODUCT`, `TECH_STACK`, `BUSINESS`). The `ConflictDetector` performs deterministic string matching and normalization against active key-value pairs stored in PostgreSQL, flagging conflicting proposed values before updates are finalized.

### 3. Asynchronous Token Streaming over Redis Channels to Celery
- **Problem**: Celery workers execute synchronously or in worker threads isolated from the ASGI event loop, making direct WebSocket writes impossible.
- **Solution**: Created a lightweight `publish_event` bridge that calls `async_to_sync(channel_layer.group_send)` from inside Celery tasks and LangGraph nodes, broadcasting events (`NODE_STARTED`, `TOKEN`, `STREAM_CHUNK`, `CONFLICT_DETECTED`) to Redis-backed channel groups keyed by blueprint UUID.

---

## 8. Failure Modes / Things That Went Wrong

1. **Redis Network Host Resolution in Non-Containerized Environments**:
   - *Issue*: During local test execution outside Docker, default configurations pointed to `redis://redis:6379/0` (the Docker network hostname), causing socket connection timeouts when executing synchronous database queries during Celery task dispatch.
   - *Fix*: Environment-based defaults (`REDIS_URL` falling back to `127.0.0.1` or in-memory fallback during test execution).

2. **LLM Structured Output Hallucinations**:
   - *Issue*: Early iterations of Gemini structured outputs occasionally returned schema-violating markdown blocks wrapped in backticks (e.g. ````json ... ````), breaking Pydantic JSON parsing.
   - *Fix*: Implemented robust pre-parsing sanitization in `GeminiProvider.generate_structured` that strips markdown code fences and cleans JSON strings before feeding them into `model_validate_json`.

3. **Tenacity Retry Backoff during Transient API Rate Limits**:
   - *Issue*: Concurrent agent invocations occasionally tripped external Gemini API rate limits (HTTP 429 / ResourceExhausted).
   - *Fix*: Wrapped provider execution with Tenacity retry decorators configuring exponential backoff with jitter (`stop_after_attempt(3)`, `wait_exponential(multiplier=1, min=2, max=10)`) targeting Google API exceptions (`ResourceExhausted`, `ServiceUnavailable`, `DeadlineExceeded`).

---

## 9. Verification / Testing

### Test Suites Implemented
- **Backend Unit & Integration Tests (Pytest + Pytest-Django)**:
  - `blueprints/tests/test_models.py`: Auto-incrementing version numbers, cascade deletions, soft deletions.
  - `blueprints/tests/test_views.py`: Blueprint creation, detail retrieval, section version listing, duplication, and export downloads.
  - `users/tests/test_models.py`: Custom user creation, email normalization, superuser defaults.
  - `users/tests/test_auth.py`: SimpleJWT registration, token issuance, credential validation.
  - `users/tests/test_throttle.py`: Tier-based request throttling limits and header verification.
  - `foundry_backend/ai_engine/tests/test_gemini_provider.py`: Mocked LLM text generation, streaming generators, structured schema validation, and retry policies on timeout/rate-limit errors.
  - `foundry_backend/decision_memory/tests/`: Conflict detection algorithms, structured extraction, graph traversal, and version rollback state restoration.
  - `foundry_backend/strategy_room/tests/`: State graph compilation, agent loop negotiation, tie-breaker routing, and Celery task execution.
- **Frontend Unit & Store Tests (Vitest + JSDOM)**:
  - `src/store/tests/stores.test.js`: Zustand store state transitions for authentication, blueprint loading, section selection, real-time stream token appending, and conflict handling.
  - `src/components/tests/components.test.jsx`: Component rendering tests for `TopBar`, `LeftRail`, `StreamingPane`, and `SectionBlock`.
- **End-to-End Tests (Playwright)**:
  - `e2e/specs/initial_generation.spec.js`: End-to-end user onboarding, idea submission, WebSocket streaming verification, and canvas section population.
  - `e2e/specs/conflict_resolution.spec.js`: Triggering a conflicting rewrite and validating conflict alert modals in the UI.
  - `e2e/specs/version_rollback.spec.js`: History drawer navigation, version selection, and canvas content rollback.
  - `e2e/specs/pricing_limits.spec.js`: Rate limit handling and 429 response verification.

---

## 10. Deployment
Foundry is packaged as a multi-container Docker Compose application configured in [`docker-compose.yml`](file:///d:/Coding/Projects----For%20Resume/Foundry/docker-compose.yml):

- `db`: PostgreSQL 15 Alpine with persistent volume `db_data` and healthcheck (`pg_isready`).
- `redis`: Redis 7 Alpine with persistent volume `redis_data` on port `6379`.
- `backend`: Python Django ASGI application running Daphne / Uvicorn on port `8000`.
- `celery`: Background worker running `celery -A foundry_backend worker --loglevel=info`.
- `frontend`: Vite React application running on port `5173`.

---

## 11. What I Learned
1. **LangGraph State Graph Design**: How to structure multi-agent systems as explicit finite-state machines with typed state schemas, bounded loop counters, and deterministic exit criteria.
2. **Hybrid Asynchronous Architectures**: How to bridge synchronous Celery workers with asynchronous Django Channels WebSocket event loops using Redis message brokers.
3. **Deterministic Memory over Non-Deterministic Models**: Why relying entirely on LLM context windows leads to compounding errors, and how relational database schemas paired with Pydantic extraction provide superior long-term consistency.
4. **Zustand Slicing and Real-Time State Ingestion**: How to structure client-side state to handle high-frequency incoming WebSocket token streams (60+ tokens/sec) without triggering unnecessary re-renders of adjacent document canvas components.

---

## 12. What Changed in My Thinking
- **Before**: I assumed multi-agent collaboration could be solved by passing the full transcript of previous turns to each subsequent LLM agent.
- **After**: I realized full-transcript prompting rapidly dilutes prompt focus, increases latency, escalates API costs, and fails to prevent contradictions. Explicit structured extraction into a relational database with key-based conflict detection is vastly more reliable than relying on an LLM to "remember" constraints buried in a 10,000-token prompt.

---

## 13. Distinctive / Interesting Details
- **The "Commitment Test" Extraction Prompt**: The extractor prompt specifically instructs the model to ignore conversational pleasantries or temporary ideas and extract only durable architectural or financial commitments.
- **Temporal Decision Reconstruction on Rollback**: When a user rolls back a section to version 2, the system doesn't merely swap the text; it inspects the exact timestamp of version 2, deactivates newer decisions, and reactivates the decisions that were active at that precise point in time.
- **Selective Subgraph Execution**: Targeted section rewrites do not re-run the entire multi-agent loop; an `AgentRouter` dynamically selects only the relevant agent subset (e.g. `Tech_Lead -> Consistency_Check` for technical architecture rewrites).

---

## 14. Skills Demonstrated

### Engineering Skills
- Multi-Agent Orchestration & State Machine Design
- Relational Database Modeling & Version Control Systems
- Real-Time Async Streaming & WebSocket Protocol Design
- Distributed Background Task Processing
- Schema-Enforced Structured Output Extraction
- Deterministic Conflict Detection & Dependency Graph Traversal
- Sliding-Window Rate Limiting & Tiered Throttling
- Full-Stack State Management & Reactive UI Design

### Technologies & Tools
- **Backend**: Python, Django, Django REST Framework, Django Channels (ASGI), Daphne, Celery, Redis, PostgreSQL.
- **AI & Graph**: LangGraph, Google Gemini API (`google-generativeai`), Pydantic v2, Tenacity.
- **Frontend**: React 19, JavaScript (ES Modules), Vite, Zustand, Axios, Lucide React.
- **Testing & Tooling**: Pytest, Pytest-Django, Vitest, Playwright, Docker, Docker Compose, Git, Oxlint.

### Concepts
- Multi-Agent Debate Loops & Consensus Convergence
- Dependency Graph Analysis & Cascading Invalidation
- Stateless JWT Authentication with Channel Middleware
- Sliding-Window Redis Cache Counters
- Optimistic UI & High-Frequency Stream Merging

### Best Skills for LinkedIn
1. **Multi-Agent AI Systems (LangGraph)**
2. **Django Channels & Real-Time WebSockets**
3. **Celery & Distributed Task Processing**
4. **PostgreSQL Schema Design & Relational Modeling**
5. **Pydantic Structured Output Pipelines**
6. **React 19 & Zustand State Management**
7. **Playwright & Pytest Automated Testing**
8. **Docker & Container Orchestration**

---

## 15. Public Content

### LinkedIn Project Description
Most multi-agent LLM applications look great in demos until turn five, when the agents start contradicting each other because prompt context becomes too noisy for reliable constraint adherence.

To explore a solution to this, I built **Foundry**—a startup blueprint generator powered by a multi-agent debate loop with an explicit **Decision Memory Engine**.

Here is how the architecture works:
1. **The Debate Loop**: An Investor, a Product Manager, and a Technical Lead debate startup requirements inside a LangGraph state machine. If they reach an impasse after five iterations, a Tie Breaker agent steps in to resolve trade-offs.
2. **The Decision Memory Engine**: Instead of dumping entire conversation transcripts into subsequent prompts, Foundry extracts durable design commitments into PostgreSQL as structured key-value decisions with cross-domain dependency edges.
3. **Targeted Regeneration & Rollbacks**: Users can rewrite or roll back any individual section (Market, Product, Tech Stack, Business). The system runs an agent router to execute only the necessary agent subsequence, validates proposed edits against active commitments, and alerts the user to contradictions before persisting updates.
4. **Real-Time Streaming**: Long-running generation runs are processed asynchronously in Celery and streamed token-by-token to a React 19 / Zustand frontend over authenticated Django Channels WebSockets.

The biggest lesson from this project: non-deterministic LLMs become significantly more powerful and reliable when paired with deterministic relational state machines.

### LinkedIn Featured Description
*Local-first containerized system with Docker Compose; not currently hosted on a public domain.*

### Resume Bullets

- **Architected a multi-agent consensus engine** using Python, Django, and LangGraph, orchestrating an iterative debate loop between Investor, PM, and Tech Lead personas with automated tie-breaking after 5 iterations.
- **Engineered a relational Decision Memory Engine** with Pydantic structured extraction and PostgreSQL dependency tracking, enabling deterministic conflict detection, cascading overrides, and point-in-time version rollbacks.
- **Built an asynchronous streaming runtime** leveraging Celery background workers, Redis channel layers, and Django Channels WebSockets to stream real-time agent token chunks to a React 19 / Zustand Mission Control UI.

### GitHub Repo One-Liner
Multi-agent startup blueprint generator with LangGraph consensus debate and a relational decision memory engine.

---

## 16. Claims That Should NOT Be Made
- Do **NOT** claim Foundry has hundreds or thousands of active users, production traffic, or commercial SaaS revenue. (It is an architectural showcase and portfolio project designed to run locally via Docker Compose).
- Do **NOT** claim sub-second full blueprint generation. (Multi-turn LLM agent debate loops naturally take 15–45 seconds depending on model response latency).
- Do **NOT** claim arbitrary scale (e.g. "handles 100k concurrent requests") — real rate limits are configured for local/development tiers (10 req/min Free, 100 req/min Premium).
- Do **NOT** claim custom fine-tuned models were trained. (Foundry uses Gemini 1.5 Flash via structured prompt engineering and API adapters).

---

## 17. Evidence / Source References

| Fact / Feature | Source File in Repository |
| :--- | :--- |
| LangGraph debate graph, nodes, and conditional routing | [`backend/foundry_backend/strategy_room/graph.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/graph.py) |
| Persona prompt templates and tie-breaking prompts | [`backend/foundry_backend/strategy_room/prompts.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/prompts.py) |
| LangGraph persona nodes & tie-breaker logic | [`backend/foundry_backend/strategy_room/nodes/`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/nodes/) |
| Celery tasks for debate and regeneration | [`backend/foundry_backend/strategy_room/tasks.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/tasks.py) |
| Structured decision extraction with Pydantic | [`backend/foundry_backend/decision_memory/extractor.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/decision_memory/extractor.py) |
| Deterministic conflict detection logic | [`backend/foundry_backend/decision_memory/conflict.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/decision_memory/conflict.py) |
| Historical rollback & decision reactivation engine | [`backend/foundry_backend/decision_memory/engine.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/decision_memory/engine.py) |
| Models (`Blueprint`, `Section`, `Version`, `DecisionLog`, `Job`, `Idea`) | [`backend/blueprints/models.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/blueprints/models.py) |
| Custom User model with email PK and tier choices | [`backend/users/models.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/users/models.py) |
| Redis sliding-window tier-based rate throttle | [`backend/users/throttling.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/users/throttling.py) |
| WebSocket consumer and channels routing | [`backend/foundry_backend/strategy_room/consumers.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/consumers.py), [`routing.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/routing.py) |
| ASGI JWT authentication middleware | [`backend/foundry_backend/strategy_room/middleware.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/strategy_room/middleware.py) |
| Gemini API provider adapter with Tenacity retry | [`backend/foundry_backend/ai_engine/providers/gemini.py`](file:///d:/Coding/Projects----For%20Resume/Foundry/backend/foundry_backend/ai_engine/providers/gemini.py) |
| React Zustand stores (auth, blueprint, canvas, strategy) | [`frontend/src/store/`](file:///d:/Coding/Projects----For%20Resume/Foundry/frontend/src/store/) |
| Mission Control layout and UI components | [`frontend/src/components/`](file:///d:/Coding/Projects----For%20Resume/Foundry/frontend/src/components/) |
| Docker Compose multi-container configuration | [`docker-compose.yml`](file:///d:/Coding/Projects----For%20Resume/Foundry/docker-compose.yml) |
| E2E Playwright test specs | [`e2e/specs/`](file:///d:/Coding/Projects----For%20Resume/Foundry/e2e/specs/) |
