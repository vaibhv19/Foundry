# Foundry — Feature List

**Project Name**: Foundry (Smart Start-up Blueprint Generator)
**Core Differentiator**: Decision Memory Engine

## AI / Frontend Layer

- **The Strategy Room** — takes a single user paragraph (the idea) and runs an autonomous debate between an AI Investor, AI Product Manager, and AI Tech Lead to build a comprehensive startup roadmap
- **Async Token Streaming** — real-time generation streams text letter-by-letter over WebSockets, so the user isn't staring at a blank screen during long AI operations
- **Interactive Document Canvas** — editable UI workspace where users can add notes and ask the system to rewrite specific paragraphs on the fly
- **Tech Stack Auto-Recommendation** — reads the startup idea and suggests the database/frontend/backend architecture actually suited to building it
- **Structured Data Export** — converts the reviewed blueprint into clean markdown or portable documents for sharing

## Backend Layer (Django)

- Auth + user accounts
- Data model: Idea → Blueprint → Sections → Versions
- Celery + Redis for async multi-agent generation (non-blocking, since the debate takes real time to run)
- Django Channels (ASGI) for real-time token streaming
- Blueprint lifecycle tracking (DRAFT → QUEUED → GENERATING → PARTIALLY_GENERATED → READY → EDITING → EXPORTING → ARCHIVED → FAILED → DELETED)
- Usage rate limiting per user/tier
- File storage for exports
- **"My Blueprints"** — list, search, permissions (user-scoped)

## Signature Backend Feature — Decision Memory Engine

- Structured decision log per blueprint — stores the reasoning behind key choices (e.g. "chose PostgreSQL because relational model fits"), not raw generated text
- On any section rewrite/regeneration, relevant past decisions are retrieved and injected into the prompt
- Enforces consistency across edits — agents stay aligned with earlier decisions unless deliberately overridden
- Distinct from Phoenix's RAG: this is memory of the system's own generation history, not retrieval from external documents — a consistency problem, not a grounding problem
- Optional stretch: surface contradictions to the user directly — "this conflicts with an earlier decision, keep both or resolve?"

## Strategy Room Debate & Regeneration

- The Strategy Room now behaves as an iterative debate: Investor → PM → Tech Lead → Consistency Check, repeating until convergence or the configured round limit, followed by a tie-break step when needed.
- Each round updates shared state with messages, agent outputs, constraints, conflicts, and decisions.
- The system supports bounded iterations, convergence checks, and a tie-breaking strategy when the debate cannot fully resolve.
- Regeneration is section-aware: changing the tech stack can trigger a targeted rerun of the Tech Lead and related decision review, while the PM and Investor may also be re-invoked when the scope or business assumptions change.
- The blueprint lifecycle expands beyond queued/generating/ready to support drafting, partial generation, editing, export, archival, failure, and deletion states.

---

## Implementation Status & Notes

* **Decision Log & Conflict Surfacing**: Fully implemented. The frontend workspace renders the active decision log in the right-side rail, intercepts websocket validation events, and displays warning alerts when edits conflict with existing choices. A modal allows the user to input a custom override rationale to overwrite decisions.
* **Exports**: Currently implemented as a Markdown `.md` document compiler. It reads the section version contents, builds a master markdown template, saves it to the local system media storage, and downloads the file through a scoped API endpoint.

