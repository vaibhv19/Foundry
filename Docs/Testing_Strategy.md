# Testing Strategy — Foundry

The testing approach for Foundry should focus on the two qualities that matter most for this project: state integrity and workflow reliability. The goal is not to test the LLM for prose quality; the goal is to ensure the runtime makes sound decisions, preserves memory, and behaves predictably.

---

## 1. Testing Principles

- Test the graph behavior, not just individual prompts.
- Test decision memory retrieval and enforcement with real state transitions.
- Test version creation and rollback logic directly.
- Test WebSocket event sequencing rather than only status strings.
- Prefer deterministic fixtures over brittle prompt-based assertions.

---

## 2. Unit Tests

Unit tests should cover:
- prompt composition logic
- decision extraction parsing
- conflict detection rules
- dependency graph traversal
- version creation rules
- state transition validation

These tests ensure that the core logic is stable even when the LLM output varies.

---

## 3. Integration Tests

Integration tests should exercise the runtime against a real or mocked database and a mocked LLM provider.

Important scenarios:
- initial debate generation completes and writes decisions
- regeneration preserves prior commitments
- manual overrides create a new active decision and mark the old one superseded
- blueprint lifecycle transitions are persisted correctly

---

## 4. Contract Tests

Contract tests should verify the REST and WebSocket interfaces.

Examples:
- the API returns the correct blueprint lifecycle state
- the WebSocket emits the expected event order for a run
- the export endpoint produces the expected artifact metadata

---

## 5. Agent and Workflow Tests

These tests validate the overall Strategy Room behavior.

Suggested cases:
- a debate converges successfully within a bounded iteration count
- a conflict is surfaced and remains visible until resolved
- a regeneration request with a dependent decision change triggers the correct downstream review
- a failed node does not erase the prior decision state

---

## 6. UI and Frontend Tests

The frontend should be tested for:
- state rendering of the mission-control layout
- conflict banner visibility
- decision inspector behavior
- version switching and rollback UI
- streaming indicator updates

The tests should cover the visible contract that the user experiences, rather than the internal implementation details.

---

## 7. Recommended Tooling

- Django / pytest for backend logic
- pytest-django for database-backed tests
- WebSocket test clients for streaming behavior
- React Testing Library for UI behavior

---

## 8. Related Documents

- [Agent_Runtime.md](Agent_Runtime.md)
- [Error_Handling.md](Error_Handling.md)
- [WebSocket_Protocol.md](WebSocket_Protocol.md)
