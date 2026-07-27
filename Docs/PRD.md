# Foundry — Product Requirements Document

## 1. Product Overview

**Foundry** (Smart Start-up Blueprint Generator) is a multi-agent AI system that turns a single-paragraph startup idea into a structured, editable startup blueprint. Three AI personas — an Investor, a Product Manager, and a Tech Lead — debate the idea autonomously and converge on a roadmap covering market positioning, product scope, and technical architecture.

The system's core differentiator is not the debate itself (multi-agent debate is now a common pattern) but what happens **after** the first draft: a **Decision Memory & Consistency Engine** that remembers *why* each choice was made and enforces that reasoning across every later edit.

## 2. Problem Statement

Existing "AI business plan generator" tools produce a single static document. The moment a user edits or regenerates one section, the tool has no memory of decisions made elsewhere in the document — it will happily suggest MongoDB in one section after having justified a relational schema in another, three paragraphs up. Foundry treats this as a **consistency problem, not a generation problem**: the hard part isn't producing plausible startup advice, it's making sure edit #47 doesn't quietly contradict decision #3.

## 3. Target Users / Resume Track Alignment

Foundry is a portfolio project, not a commercial product. It's built to demonstrate:
- Async backend architecture (Django + Celery + Redis + Channels) under real-time constraints
- Multi-agent LLM orchestration with shared, persistent state (not just prompt chaining)
- A genuinely hard state-management problem (decision consistency) rather than a thin LLM wrapper

Primary resume tracks: Python/Django Backend, AI Engineer, Full Stack (Django + React).

## 4. Core Differentiator: Decision Memory & Consistency Engine

- Every key choice the agents make is stored as a **structured decision log entry** (e.g. "chose PostgreSQL because the data model is relational") — not the raw generated prose, but the extractable reasoning behind it.
- When a user asks to rewrite or regenerate any section, the engine retrieves relevant past decisions and injects them into the regeneration prompt.
- Agents are constrained to stay aligned with earlier decisions unless the user deliberately overrides them.
- This is explicitly **different from [Phoenix's](Phoenix) RAG**: Phoenix retrieves from external documents to answer questions it doesn't know the answer to (a grounding problem). Foundry retrieves from its *own* generation history to avoid contradicting itself (a consistency problem).
- Stretch goal: surface contradictions directly to the user — "This conflicts with an earlier decision. Keep both, or resolve?"

## 5. Core Features

### 5.1 The Strategy Room
Takes one user paragraph (the idea) and runs an autonomous multi-agent debate (AI Investor, AI PM, AI Tech Lead) to produce a comprehensive startup roadmap.

### 5.2 Async Token Streaming
Real-time, letter-by-letter generation over WebSockets so the user watches the debate unfold instead of staring at a loading spinner during long-running multi-agent generation.

### 5.3 Interactive Document Canvas
An editable workspace where the user can annotate the blueprint and ask the system to rewrite specific paragraphs in place.

### 5.4 Tech Stack Auto-Recommendation
Reads the startup idea and recommends a database/frontend/backend architecture suited to *that specific idea* (not a generic template).

### 5.5 Structured Data Export
Converts the reviewed, finalized blueprint into clean markdown or a portable document for sharing outside the app.

## 6. Backend Requirements (Django)

- Auth + user accounts
- Data model: `Idea → Blueprint → Sections → Versions`
- Celery + Redis for async multi-agent generation (the debate takes real wall-clock time and must not block the request thread)
- Django Channels (ASGI) for real-time token streaming to the client
- Job status tracking: `queued → generating → ready`
- Per-user/per-tier usage rate limiting
- File storage for exports
- "My Blueprints": list, search, and permissions, scoped per user

## 7. Non-Goals (v1 Scope Boundaries)

- No payments/billing — this is a portfolio project, not a monetized product
- No team/multi-user collaboration on a single blueprint (single-owner blueprints only)
- No deployment/infra ops beyond local Docker Compose (matches the scope decision made for Phoenix)
- Contradiction *surfacing* to the user is a stretch goal, not a v1 requirement — v1 only needs to *enforce* consistency, not necessarily *explain* every conflict

## 8. Success Criteria

- A user can submit an idea and watch a three-agent debate stream in real time to a complete blueprint
- Editing/regenerating any one section does not silently contradict an unrelated, already-decided section elsewhere in the same blueprint
- The decision log for a blueprint is inspectable and human-readable, not just an internal implementation detail
- Repo quality matches [[Phoenix]] and [[Trajectory]]: root README, per-module READMEs, a `Docs/` folder, a `Docs/Learning/` knowledge base, and a final Phase 11 Documentation & Audit pass

## 8.1 Strategy Room Debate Model

The Strategy Room is no longer treated as a single linear handoff. It is a structured multi-agent debate with explicit rounds, state evolution, and convergence logic.

- Round 1: Investor reviews business viability and establishes value, budget, and risk constraints.
- Round 2: Product Manager proposes product strategy, prioritization, and user-facing scope.
- Round 3: Tech Lead evaluates feasibility, cost, and technical trade-offs against the PM proposal.
- Round 4+: The Investor may challenge the technical cost of the proposal, the PM may revise features, and the Tech Lead may negotiate trade-offs until the state converges.
- The debate continues until either the agents reach convergence or the system hits a configured maximum iteration count.
- Convergence is achieved when the key decisions are stable across agents and no unresolved conflicts remain in the shared state.
- If the debate fails to converge, a tie-breaking strategy is applied: the Tech Lead proposes the lowest-risk implementation path while the Investor and PM review the cost/fit trade-off one final time before the blueprint is marked ready for editing.

The shared state evolves across each round: the idea remains fixed, but the message history, agent outputs, constraints, conflicts, decisions, and confidence scores are all updated after every turn. The system preserves this state so a later regeneration can reason over the full debate history rather than only the latest utterance.

## 9. Assumptions & Constraints

- LLM calls are the long-pole latency item — Celery + Channels exist specifically because a synchronous request/response cycle can't hold a debate open for tens of seconds
- The Decision Memory engine only needs to reason over *this blueprint's* own history — it is explicitly not a general-purpose RAG system and should not be built like one
