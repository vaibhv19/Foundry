# LangGraph Multi-Agent Orchestration

This document details the multi-agent design, state machine flow, and loop convergence strategies implemented for the Strategy Room runtime in Phase 05.

## 1. Multi-Agent Flow Overview

The Strategy Room debate engine is orchestrated using LangGraph to manage structured negotiation between distinct startup personas.

```mermaid
graph TD
    START --> Investor
    Investor --> PM[Product Manager]
    PM --> TechLead[Tech Lead]
    TechLead --> Consistency[Consistency Check]
    Consistency -- "Conflicts Present & Iterations < 5" --> Investor
    Consistency -- "No Conflicts" --> END
    Consistency -- "Conflicts Present & Iterations >= 5" --> TieBreaker[Tie-Breaker]
    TieBreaker --> END
```

### Execution Steps

1.  **Investor**: Establishes target audience, business pricing strategy, and initial cost constraints.
2.  **Product Manager (PM)**: Outlines user journeys and must-have features within the Investor's constraints.
3.  **Tech Lead**: Evaluates the PM's roadmap for engineering feasibility and recommends architectural stacks.
4.  **Consistency Check**: A validator node that runs the debate history through a structured LLM schema to check for contradictions. Increments the iteration counter.
5.  **Tie-Breaker**: Activated only if the negotiation has failed to converge after 5 rounds. Selects the most conservative, low-cost options to resolve conflicts and force completion.

---

## 2. Shared Graph State Parameters

The execution state is tracked in the `StrategyRoomState` TypedDict:

-   `idea` (`str`): The raw text idea input by the user.
-   `messages` (`List[Dict[str, Any]]`): Running transcript containing the agents' conversation.
-   `agent_outputs` (`Dict[str, Any]`): Stores the latest raw generated text from each persona.
-   `debate_history` (`List[Dict[str, Any]]`): Event audit logging node operations.
-   `constraints` (`List[str]`): List of active business, budget, or architectural constraints.
-   `conflicts` (`List[Dict[str, Any]]`): List of active, unresolved conflicts identified by the Consistency Check node.
-   `resolved_conflicts` (`List[Dict[str, Any]]`): Historical log of resolved/overridden conflicts.
-   `decisions` (`List[Dict[str, Any]]`): Committed decisions.
-   `pending_decisions` (`List[Dict[str, Any]]`): Decisions currently under negotiation.
-   `current_agent` (`str`): The ID of the currently active agent.
-   `confidence_scores` (`Dict[str, float]`): Confidence metrics.
-   `iteration_count` (`int`): Counter tracking the number of negotiation loops.
-   `blueprint_context` (`Dict[str, Any]`): Model schema context.

---

## 3. Loop Convergence & Negotiation Limits

Agent negotiations can loop if contradictions occur. To prevent infinite execution or excessive token usage:
-   **Validation**: The `Consistency Check` node runs structured schema evaluation on every loop.
-   **Loop Boundary**: A strict limit of **5 iterations** is enforced.
-   **Conditional Routing**:
    -   If no conflicts are found, the state machine routes directly to `END`.
    -   If conflicts are found and `iteration_count` is less than 5, it routes back to `Investor` for renegotiation.
    -   If conflicts persist and `iteration_count` reaches 5, the state machine routes to `Tie_Breaker` to force resolution.

---

## 4. Database Persistence

Upon debate completion, the `GraphRunner` wrapper service manages the transactional database persistence:
1.  **Sections creation**: Creates `Section` records for `BUSINESS` (Investor content), `PRODUCT` (PM content), `TECH_STACK` (Tech Lead content), and `MARKET` (Investor constraints).
2.  **Version history**: Registers a new active `Version` record for each section, setting any prior versions to inactive.
3.  **Status update**: Updates the parent `Blueprint` status to `READY`.
