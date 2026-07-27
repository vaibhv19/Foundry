# App Flow & Execution Lifecycles: Foundry

This document outlines the user journeys, data orchestration, and execution lifecycles for **Foundry**. It details how a single-paragraph idea evolves into a multi-dimensional startup blueprint through an autonomous multi-agent debate and how the **Decision Memory Engine** maintains architectural integrity during edits.

---

## 1. The Strategy Room Flow (Initial Generation)

This flow tracks the transition from a raw idea to a structured, version-controlled blueprint via an asynchronous multi-agent state graph.

1.  **Submission:** User enters a one-paragraph startup idea into the Strategy Room interface (React).
2.  **Ingestion:** Frontend sends the idea to `POST /api/v1/blueprints/` (React → Django).
3.  **Initialization:** Django creates an `Idea` record and a `Blueprint` record with lifecycle state `QUEUED` (Django → PostgreSQL).
4.  **Handoff:** Django triggers the `run_strategy_debate` task via Celery and returns the `blueprint_id` (Django → Celery).
5.  **Socket Connection:** Frontend opens a WebSocket connection to the Blueprint's stream channel (React → Django Channels).
6.  **Debate Startup:** Celery worker updates Blueprint status to `GENERATING` and initializes the LangGraph state graph (Celery).
7.  **Investor Node:** The AI Investor analyzes market viability and sets the "Commercial North Star" for the blueprint (LangGraph/AI).
8.  **Logging (Decision Memory):** The Investor's key strategic choices are extracted and saved to the `DecisionLog` table (Celery → PostgreSQL).
9.  **PM Node:** The AI Product Manager receives the Investor’s constraints and defines core features and user personas (LangGraph/AI).
10. **Tech Lead Node:** The AI Tech Lead proposes a stack and architecture that supports the PM’s features and the Investor’s budget/scale (LangGraph/AI).
11. **Token Streaming:** As nodes generate content, raw tokens are pushed in real-time to the user's screen (Celery → Channels → React).
12. **Convergence:** The "Consistency Check" node verifies there are no obvious contradictions between the three personas (LangGraph/AI).
13. **Finalization:** Celery worker creates the initial `Sections` and `Versions` (v1) for the blueprint and sets status to `READY` (Celery → PostgreSQL).
14. **Completion:** Frontend receives the `COMPLETE` event and transitions from the "Streaming" view to the "Document Canvas" (Channels → React).

---

## 2. Interactive Document Canvas Flow (Review)

This flow handles the rendering and exploration of the finalized multi-agent output.

1.  **Hydration:** React requests the full blueprint structure via `GET /api/blueprints/{id}` (React → Django).
2.  **Section Mapping:** Django retrieves all sections (Market, Product, Tech Stack) and their latest versions (Django → PostgreSQL).
3.  **Layout Rendering:** The Interactive Document Canvas renders the blueprint as a structured, editable workspace (React).
4.  **Decision Inspection:** User hovers over specific architectural choices to see the "Reasoning" (the stored Decision Log entry) behind that choice (React).
5.  **State Management:** The current active version for each section is stored in the global state (Zustand).

---

## 3. The Consistency Loop (Section Edit & Regeneration)

This flow demonstrates Foundry's core differentiator: ensuring that targeted edits do not introduce contradictions with previously established decisions.

1.  **Selection:** User highlights a specific section (e.g., "Database Architecture") and enters a rewrite request or a specific note (React).
2.  **Edit Request:** Frontend sends the section ID and user instructions to `POST /api/v1/sections/{id}/regenerate/` (React → Django).
3.  **Memory Retrieval (Decision Memory):** The engine queries the `DecisionLog` for this blueprint, specifically retrieving choices made in *other* sections that constrain this one (Django → PostgreSQL).
    *   *Example: If the "Market" section decided on "High-frequency financial transactions," the engine retrieves this to ensure the "Tech" rewrite doesn't switch to a slow eventual-consistency DB.*
4.  **Prompt Injection:** Django constructs a "Consistency Prompt" containing the user's request + the retrieved decision logs + the existing section context (Django).
5.  **Targeted Generation:** The AI Tech Lead (or relevant agent) generates a new version of the section while adhering to the injected constraints (AI).
6.  **Version Creation:** Django saves the output as a new `Version` (e.g., v2) for that section, maintaining a pointer to the previous state (Django → PostgreSQL).
7.  **In-Place Update:** The UI performs a partial re-render, replacing only the targeted section with the new version (Django → React).
8.  **Conflict Check (Stretch):** If the new user request directly violates a stored decision, the UI prompts: "This change conflicts with your earlier choice of [X]. Overwrite the previous decision?" (React).

---

## 4. Structured Data Export Flow

This flow converts the dynamic, multi-versioned blueprint into a portable format.

1.  **Finalization:** User clicks "Export Blueprint" and selects a format (Markdown/Portable Document) (React).
2.  **Aggregation:** Django fetches the latest active `Version` for every `Section` belonging to the `Blueprint` (Django → PostgreSQL).
3.  **Assembly:** The system stitches the sections together in the standard "Foundry Roadmap" order (Django).
4.  **Conversion:** The compiled text is processed through a Markdown-to-PDF/Docx generator or served as raw Markdown (Django).
5.  **Delivery:** The user receives a download prompt for the finalized file (Django → React).

---

## 5. Debate Rounds, Convergence, and Regeneration Strategy

The initial generation flow now behaves as a bounded debate rather than a single pass through three agents.

1. **Round 0 — Intake:** The system creates a `DRAFT` blueprint, records the initial idea, and seeds the state graph with the first constraints.
2. **Round 1 — Investor Review:** The Investor evaluates market viability, expected customer value, and cost sensitivity.
3. **Round 2 — Product Strategy:** The PM proposes scope, positioning, and a feature set that reflects the investor constraints.
4. **Round 3 — Technical Feasibility:** The Tech Lead checks whether the PM's proposal is implementable within the investor's constraints and the chosen risk posture.
5. **Round 4+ — Negotiation:** The Investor may challenge the proposed cost, the PM may revise product scope, and the Tech Lead may negotiate trade-offs. The loop continues until the state converges or the iteration limit is reached.
6. **Convergence:** The system checks whether the active decisions are stable and whether the current conflicts list is empty or resolved. If not, it applies a tie-breaker: the Tech Lead proposes the lowest-risk technical path, and the Investor/PM perform one final review cycle.
7. **Shared State Evolution:** Each round appends to `messages`, updates `agent_outputs`, populates `constraints` and `conflicts`, and promotes selected values into `decisions` or `pending_decisions`.

### Regeneration Strategy
When a section is regenerated, the system does not blindly rerun the entire debate.

- If the Tech Stack changes, the Tech Lead reruns first. The PM and Investor may also rerun if the change materially affects product scope or business viability.
- The Consistency Check node is invoked after every targeted regeneration to confirm that the revised section still respects the active decision set.
- New decisions are extracted whenever a new commitment is introduced, overridden, or materially revised.
- Each regeneration creates a new section version. The previous version remains available for rollback and comparison.
- Rollback is handled by restoring the prior active version for the section and reactivating the corresponding decision state, while preserving the newer version as a historical artifact.

## 6. Blueprint Lifecycle in Practice

The lifecycle now follows the production-grade sequence:

- `DRAFT` → `QUEUED` → `GENERATING` → `READY` for the first successful pass.
- `READY` → `EDITING` when the user begins a regen or manual edit.
- `EDITING` → `GENERATING` for targeted regeneration.
- `GENERATING` may temporarily enter `PARTIALLY_GENERATED` if some sections are ready while others still run.
- `READY` or `EDITING` can move to `EXPORTING`, then `ARCHIVED`.
- Any fatal failure moves to `FAILED`; a soft delete moves to `DELETED`.

## Summary of Decision Memory Engine Invocation

| Flow Phase | Decision Memory Action | Logic Type |
| :--- | :--- | :--- |
| **Initial Generation (Flow 1)** | **Record:** Agents extract choices and store them in the `DecisionLog`. | Write-Only |
| **Review (Flow 2)** | **Display:** UI surfaces the reasoning behind specific blocks to the user. | Read-Only |
| **Regeneration (Flow 3)** | **Enforce:** Engine retrieves logs and injects them into the LLM prompt to prevent contradictions. | **Retrieval & Injection** |
| **Export (Flow 4)** | **N/A:** System only aggregates finalized text. | None |