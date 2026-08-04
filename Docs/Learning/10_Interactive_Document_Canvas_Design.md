# Interactive Document Canvas Design

This document details the configuration, visual layouts, and interaction layers of the React frontend workspace implemented in Phase 10.

## 1. Mission Control Layout Grid

The workspace uses a full-screen grid system structured in `src/components/layout/MissionControlLayout.jsx`:

-   **`TopBar`**: Displays the active plan title, status, and the `convergenceProgress` bar (updating reactively to token streams).
-   **`LeftRail`**: Houses the vertical agent timeline (Investor, PM, Tech Lead, Consistency Check, Tie Breaker). It maps current node states and triggers the `.thinking-pulse` keyframe glow around active node badges.
-   **`RightRail`**: Focuses on constraints inspection. It logs active decisions and displays override panels when conflicts occur.
-   **`CenterPanel`**: Displays either the active debate logs stream (observer mode) or the compiled block grid and edit sidebar (authoring mode).

---

## 2. Interactive Document Canvas Blocks

The startup plan is organized as four cards (Market, Product, Tech Stack, Business) managed via `CanvasGrid.jsx` and `SectionBlock.jsx`:

-   **Version Toggle Pills**: Each card fetches its historical snapshots list. Clicking a pill badge calls the REST `/restore/` endpoint, rolling back the section's active content.
-   **Inline Decision Anchors (`⚓`)**: A custom text parser scans the section markdown. When it detects a substring matching an active decision value, it overlays a clickable anchor link. Clicking it opens a popover detailing:
    -   Decision owner.
    -   Rationale.
    -   Priority tier.

---

## 3. Conflict Resolution & Overrides Flow

When a user submits rewrite instructions with "Enforce Decisions" enabled and it contradicts past commitments:

1.  The celery worker raises `ConsistencyViolationError` and sets the job to `FAILED` with `DECISION_OVERRIDE_REQUIRED`.
2.  The websocket channel relays the failure block, and the frontend store dispatches to `conflictAlert` in `canvasStore`.
3.  The client displays the warning `ConflictBanner` with conflict details.
4.  The user can re-submit with "Proceed & Override" to de-enforce commitments. The backend then overrides contradictory items and applies the change.

---

## 4. Engineering Lessons & Troubleshooting Stories

### 4.1 Input Textarea Keystroke Responsiveness
* **Problem**: Typing prompt instructions inside the targeted rewrite sidebar was extremely sluggish, with typed characters taking up to 200ms to render in the textarea.
* **Why it happened**: The text state was originally stored globally in the Zustand `canvasStore`. Every keypress event triggered a store dispatch, causing a re-render of the parent workspace grid and parsing anchor links in all sections on every keystroke.
* **Solution**: We isolated the typing state locally within the `RewriteSidebar` React component using a standard `useState` hook. The global Zustand store is only updated when the user clicks the final "Regenerate" button, keeping keystrokes localized and running at 60 FPS.

### 4.2 Resolving Visual Monotony in Card Layouts
* **Problem**: Early implementations of the Canvas workspace suffered from "cards-within-cards" layout nesting. Every section card (Market, Product, Tech Stack, Business) had its own border, and the inputs and list elements inside them had secondary borders, making the page look like a cluttered stack of boxes.
* **Solution**: We implemented visual hierarchy by reducing borders and introducing background shade shifts. We removed the borders from inner elements (such as textareas, labels, and metadata footers) and replaced them with subtle bottom lines or neutral background shifts. This clearly separates genuine content containers from internal inputs, improving layout readability.

