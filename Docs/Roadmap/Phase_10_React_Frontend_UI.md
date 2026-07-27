# Phase 10 — React Frontend: Strategy Room & Canvas UI

## Phase Goal
The objective of this phase is to construct the production-grade user interface of Foundry. We will implement the high-fidelity Mission Control layout, build the Strategy Room streaming interface (featuring the vertical Agent Timeline and Thinking Pulse indicators), develop the Interactive Document Canvas with block-based editing, implement version history toggle pills, and build the Decision Inspector sidebar and Conflict Banner for manual overrides.

---

## Folder Structure

```text
frontend/
└── src/
    ├── components/
    │   ├── layout/
    │   │   ├── TopBar.jsx             # Title, Status, Convergence Meter
    │   │   ├── LeftRail.jsx           # Agent activity timeline
    │   │   ├── RightRail.jsx          # Decision & Conflict panels
    │   │   └── MissionControlLayout.jsx
    │   ├── strategy/
    │   │   ├── StreamingPane.jsx      # Streams debate tokens
    │   │   └── AgentBadge.jsx         # Custom styled status indicator
    │   ├── canvas/
    │   │   ├── CanvasGrid.jsx         # Block list layout
    │   │   ├── SectionBlock.jsx       # Single category canvas block
    │   │   ├── VersionToggle.jsx      # version pill selection
    │   │   ├── RewriteSidebar.jsx     # Side prompt execution
    │   │   └── DecisionAnchor.jsx     # Anchor icon and popover
    │   └── export/
    │       └── ExportPanel.jsx        # Preview and Markdown downloaders
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Dashboard.jsx              # Idea entry list
        └── Editor.jsx                 # Dynamic editor wrapper
```

---

## Module Definitions

### 1. Mission Control Layout Container
* **Purpose**: Coordinates high-density operational surfaces.
* **Responsibilities**: Allocating grids, displaying overall metrics (iteration count, convergence status), and swapping center views.
* **Dependencies**: React Router.
* **Outputs**: Grid panels (`TopBar`, `LeftRail`, `RightRail`, `CenterPanel`).

### 2. Strategy Room Stream Panel
* **Purpose**: Displays the active agent debate.
* **Responsibilities**: Showing typing markers, streaming content chunk-by-chunk, and rendering the Agent Activity Timeline.
* **Dependencies**: `useStrategyRoomStore`.
* **Aesthetics**: Sans-serif text for Investor/PM, JetBrains Mono font for Tech Lead. Subtle glowing rings around badges representing active turns (Thinking Pulse).

### 3. Interactive Document Canvas
* **Purpose**: Displays and edits the compiled startup plan.
* **Responsibilities**: Laying out category blocks, rendering inline markdown text, triggering targeted section edits, and toggling version snapshots.
* **Dependencies**: `useCanvasStore`, `useBlueprintStore`.
* **Aesthetics**: Industrial grid spacing, monospaced headers, serif typography.

### 4. Decision Inspector Popover
* **Purpose**: Integrates the Decision Memory Engine visually into the Canvas.
* **Responsibilities**: Rendering anchor icons `(⚓)` alongside constrained text blocks, showing popup boxes on click detailing key decisions, owners, and rationales.
* **Dependencies**: `useCanvasStore`.

---

## UI Constraint Enforcement (Recall)
* ❌ **No Spinners**: Use status text update notifications instead of circles.
* ❌ **No Chat Bubbles**: The Strategy Room is a structured debate dashboard log, not a chat thread.
* ❌ **No Hidden Rewrites**: Display constraint injection blocks explicitly so the user sees what the AI is preserving.

---

## Atomic Implementation Tasks

### Task 10.1: Build Auth Screen Components
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 9.4
* **Description**: Create registration and login pages using form validations and linking to `authStore` actions.
* **Definition of Done**: Login and Registration forms validate input and authenticate sessions.

### Task 10.2: Implement Main User Dashboard
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 10.1
* **Description**: Build `/dashboard` route. Shows list of user blueprints, search input, soft delete buttons, and a clean "Submit Idea" text input. Clicking submit invokes API and redirects to `/editor/:blueprint_id` workspace.
* **Definition of Done**: Dashboard displays blueprints list and submits ideas.

### Task 10.3: Create Mission Control Grid Shell
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 10.2
* **Description**: Write `MissionControlLayout` component defining a structured layout: Left Rail (Agent Timeline), Right Rail (Decision Inspector), Top Bar (Stats), and Center Panel.
* **Definition of Done**: Layout partitions space cleanly on large displays.

### Task 10.4: Implement Strategy Room - Streaming Feed Panel
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 10.3, Task 9.6
* **Description**: Create `StreamingPane` component mapping active token streaming arrays. Highlight active node contributions with Agent Badges:
  - `[INV]` Gold border, serif font.
  - `[PM ]` Indigo border, sans-serif font.
  - `[TEC]` Teal border, JetBrains Mono font.
* **Definition of Done**: Tokens stream smoothly with distinct formatting per agent.

### Task 10.5: Implement Strategy Room - Agent Activity Timeline
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 10.4
* **Description**: Implement `LeftRail` rendering a vertical event feed indicating when a node starts execution (`NODE_STARTED`), completes (`NODE_COMPLETED`), or errors. Add `ThinkingPulse` glowing animation to the active node.
* **Definition of Done**: Vertical status timeline updates reactively to socket events.

### Task 10.6: Create Document Canvas - Block Grid Layout
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 10.3, Task 9.7
* **Description**: Create `CanvasGrid` showing 4 section blocks: Market, Product, Tech Stack, and Business model. Render active markdown content for each section.
* **Definition of Done**: Active section contents display in structured card blocks.

### Task 10.7: Implement Canvas Block - Version Toggle pills
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 10.6
* **Description**: On each section header, render clickable version badges (e.g. `v1`, `v2`, `v3`). Clicking a badge updates the active view selection or toggles a comparison overlay.
* **Definition of Done**: Toggle changes shown block contents to the selected version in the UI.

### Task 10.8: Develop Revision Sidebar & Rewrite Prompt
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 10.6
* **Description**: Implement `RewriteSidebar`. Displays text input for instructions. Renders a toggle: "Enforce Previous Decisions". Includes "Regenerate" button which calls the backend and displays the active token stream inside the target section block.
* **Definition of Done**: Section-specific edits execute in the background and stream tokens directly.

### Task 10.9: Build Decision Inspector Anchor Popovers
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 10.6, Task 9.7
* **Description**: Alongside section texts, render anchor icons `(⚓)` near choices shaped by decisions (e.g. PostgreSQL, AWS). Clicking anchor opens popover listing: Category, Key, Value, Rationale, Owner, and a list of downstream dependencies.
* **Definition of Done**: Popover displays correct decision metadata on clicking anchor.

### Task 10.10: Build Conflict Alerts and Manual Override Modal
* **Size**: M
* **Risk**: High
* **Prerequisites**: Task 10.8, Task 10.9
* **Description**: Create `ConflictBanner` and override modal. When a regeneration task returns a `422 Conflict` or fails with a conflict error:
  - Display the banner detailing the contradiction.
  - Ask user: "Change the Database to MongoDB? This violates past decisions..."
  - Include "Proceed & Override" button (calling backend override REST endpoint) and "Cancel" button.
* **Definition of Done**: Modal captures conflict details and sends override confirmations.

### Task 10.11: Develop Markdown Export Panel
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 10.6
* **Description**: Implement `ExportPanel` containing download triggers for Markdown and PDF. Exposes document preview pane.
* **Definition of Done**: Triggers document compilation and downloads files locally.

### Task 10.12: Write React Components Unit Tests
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 10.10
* **Description**: Write frontend component tests using React Testing Library and Jest:
  - Assert dashboard lists blueprints correctly.
  - Verify section version toggles update section body.
  - Mock WebSocket feeds to verify streaming text rendering.
* **Definition of Done**: Components render and pass all user interaction assertion tests.

---

## Milestone Verification Checkpoint (Milestone 05)
* **Status**: Running suite.
* **Behavior**: System fully integrated. A user submits an idea, watches streaming debates on the dashboard, views the final blueprint, makes targeted edits, overrides constraints, and exports files.
* **Incomplete Features**: None (E2E system complete).

---

## Suggested Git Commits
- `feat/frontend/auth-views`: Registration and Login pages.
- `feat/frontend/dashboard-view`: Dashboard listing and idea submission views.
- `feat/frontend/mission-layout`: Mission Control layout panels.
- `feat/frontend/stream-pane`: Token streaming feed and agent badges.
- `feat/frontend/timeline-indicator`: Left rail activity timeline and thinking pulse animations.
- `feat/frontend/canvas-grid`: Interactive Document Canvas block grid.
- `feat/frontend/version-toggle`: Block headers and version selection pills.
- `feat/frontend/revision-sidebar`: Section editing input sidebar.
- `feat/frontend/decision-anchors`: Clickable anchor icons and popover details.
- `feat/frontend/conflict-override`: Conflict banners and override confirm dialogs.
- `feat/frontend/export-ui`: Export preview window and download triggers.
- `test/frontend/components`: Component unit and interaction tests.

---

## Suggested GitHub Issues
* **Issue #5.3**: Develop Strategy Room "Observer Mode" interface (Streaming, Timeline).
* **Issue #5.4**: Implement Interactive Document Canvas with block edits.
* **Issue #5.5**: Create Decision Inspector popovers, Conflict Banners, and Export downloaders.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/10_Interactive_Document_Canvas_Design.md`**: Detail the styling tokens, animation layers, block rendering systems, and inline decision anchor structures.
