# UI_Design.md — Foundry Visual Design System

This document governs the visual identity and user interface patterns for **Foundry**. It defines the transition from high-velocity autonomous generation in the **Strategy Room** to the focused, structured environment of the **Interactive Document Canvas**.

---

## 1. Design Philosophy: "From Debate to Document"

Foundry is a transition engine. It moves from a fluid, multi-agent debate to a rigid, actionable blueprint. The UI must reflect this shift in state.

### The Observer-to-Editor Shift
*   **The Strategy Room (Observer Mode):** The UI should feel like a high-stakes intelligence briefing. The user is an observer watching three experts (agents) converge. Motion and streaming should emphasize the autonomous nature of the process.
*   **The Document Canvas (Editor Mode):** Once the draft is finalized, the interface "settles." The visual noise of the debate recedes, replaced by a calm, high-focus workspace optimized for review and targeted editing.

### Key Principles:
*   **Persona Distinction:** Each agent must be instantly recognizable via color and typography to allow the user to mentally bucket technical vs. strategic vs. product advice.
*   **Traceability:** The "Decision Memory" should be visible but non-intrusive—proving the system is consistent without cluttering the prose.
*   **Industrial Precision:** Use rigid grids, mono-spaced data points, and technical borders. Avoid soft shadows, rounded buttons, or playful gradients.

---

## 2. Visual Identity & Palette Options

### Option A: "The Industrial Forge" (High Contrast / Strategic)
*   **Concept:** Emphasizes the "construction" of a startup. Deep slates and high-visibility accents.
*   **Base:** `#0F172A` (Slate 900) / `#F8FAFC` (Slate 50)
*   **Accents:** `Orange 500` (The Spark), `Cyan 500` (The Blueprint).
*   **Agent Mapping:**
    *   **Investor:** Gold / Amber (Commercial Value)
    *   **PM:** Indigo / Violet (User Flow)
    *   **Tech Lead:** Emerald / Teal (Infrastructure)
*   **Rationale:** Highest legibility for long-form text and feels "heavy" and significant.

### Option B: "The Technical Draft" (Minimalist / Systematic)
*   **Concept:** Mimics a professional drafting table or an architectural blueprint.
*   **Base:** `#FFFFFF` (White) / `#E2E8F0` (Slate 200)
*   **Accents:** `Royal Blue 600` (Ink), `Deep Red 600` (Constraints).
*   **Agent Mapping:**
    *   **Investor:** Deep Navy
    *   **PM:** Slate Gray
    *   **Tech Lead:** Cobalt Blue
*   **Rationale:** Feels like a tool for builders. Low eye strain for long editing sessions.

### Option C: "The Terminal Console" (Technical / Dark Mode)
*   **Concept:** A modern, code-editor-inspired aesthetic for technical founders.
*   **Base:** `#09090B` (Zinc 950) / `#18181B` (Zinc 900)
*   **Accents:** `Lime 400` (Terminal Green), `Fuchsia 500` (Logic).
*   **Agent Mapping:**
    *   **Investor:** Purple 400
    *   **PM:** Blue 400
    *   **Tech Lead:** Green 400
*   **Rationale:** Matches the "Tech Lead" persona of the project and focuses on data density.

---

## 3. Screen-Specific Layouts

### 3.1 The Strategy Room (Live Debate)
*   **The Triage View:** A three-column or radial layout showing the status of the **Investor**, **PM**, and **Tech Lead**.
*   **The Live Stream:** A central activity feed where tokens stream in. Each message is tagged with the agent's unique badge.
*   **The Convergence Meter:** A progress indicator at the top showing the "Convergence Score." As the `Consistency_Check` node runs, the meter fills, signaling the transition to the Canvas.

### 3.2 The Interactive Document Canvas
*   **Block-Based Editor:** Each section (Market, Tech Stack, etc.) is a distinct "Block." 
*   **The Revision Sidebar:** When a section is selected, a sidebar appears for "Rewrite Requests." 
*   **Version Toggle:** A small "v1 / v2" pill on each block header to swap between generation attempts.

### 3.3 The Export Preview
*   **The Raw View:** A clean, distraction-free Markdown preview.
*   **The Asset Panel:** Quick-download buttons for PDF, Markdown, and the **JSON Decision Log** (for technical audits).

---

## 4. Component Patterns

### 4.1 Agent Persona Badges
Each agent has a fixed visual signature used throughout the app:
*   **Investor:** `[INV]` — Serif font (e.g., Playfair Display), Gold border.
*   **PM:** `[PM ]` — Sans-serif (e.g., Inter), Indigo border.
*   **Tech Lead:** `[TEC]` — Mono font (e.g., JetBrains Mono), Teal border.

### 4.2 The "Consistency Trace" (Decision Memory UI)
This is the UI manifestation of the **Decision Memory Engine**. 
*   **Visual Treatment:** A small "Link" or "Anchor" icon `(⚓)` appearing in the margin of a regenerated section.
*   **Interaction:** Clicking the anchor reveals a popover: 
    > *"This section was shaped by an earlier decision: **PostgreSQL**. (Rationale: ACID compliance for financial data)."*
*   **Constraint Warning:** If the user tries to request a rewrite that contradicts a stored decision, the "Anchor" turns **Amber**, and a "Decision Conflict" warning appears before the generation begins.

### 4.3 Streaming/Typing Indicator
Standard "dots" are prohibited. Use a **"Thinking Pulse"**: 
*   A subtle glow around the active Agent Badge while that node is processing in LangGraph.
*   A status line: `[TEC] is evaluating PM's feature list for technical feasibility...`

### 4.4 Version History Indicator
*   Located in the top-right of each section block.
*   Format: `v2` (clickable).
*   Clicking expands a "Ghost Version" view—a diff-like overlay showing what changed between the last generation and the current one.

---

## 5. Non-Negotiable UI Constraints

*   ❌ **No Generic Loading Spinners:** Use status-text updates (`Node: PM_Refining`) instead of empty progress circles.
*   ❌ **No "Chatbot" Bubbles:** The Strategy Room should look like a structured log or a multi-pane dashboard, not a WhatsApp thread.
*   ❌ **No Hidden Rewrites:** The user must see the "Consistency Injections" being applied so they understand *why* the AI is refusing or adhering to specific architectural choices.