# Prompt Architecture — Foundry

This document defines the prompt design for the Strategy Room, the Decision Memory engine, and the regeneration workflow. It intentionally keeps the prompt stack structured and auditable rather than relying on a single monolithic instruction block.

---

## 1. Architecture Overview

Foundry uses a layered prompt system so each part of the runtime receives the right context at the right time.

- The **System Prompt** defines the shared identity of the application and the high-level operating rules.
- The **Agent Prompts** shape each persona's behavior: Investor, Product Manager, and Tech Lead.
- The **Consistency and Decision Prompts** ensure that the graph stays aligned with prior decisions.
- The **Regeneration Prompt** is narrower and section-specific, focused on preserving the blueprint's logic during edits.

This structure keeps the system grounded in the blueprint's own history rather than treating every generation as a brand-new task.

---

## 2. Prompt Hierarchy

The prompt stack is composed in layers from global to local:

1. **System Prompt**
2. **Runtime Context Prompt**
3. **Agent-Specific Prompt**
4. **Decision Memory Prompt Block**
5. **Task-Specific Prompt**
6. **Output Schema Prompt**

The hierarchy ensures that the agent sees the broad operating contract first, then the state context, then the precise instruction for the current node.

---

## 3. System Prompt

The System Prompt establishes the role of the whole application:

- Foundry is a startup blueprint generator for portfolio-quality architectural demonstrations.
- The system must produce structured, coherent, and internally consistent output.
- The system should preserve prior decisions unless the user explicitly overrides them.
- The system should prefer stable commitments over speculative suggestions.
- The system must surface conflict rather than silently generating contradictory content when a change would break earlier decisions.

The System Prompt is reused across generation, regeneration, and decision extraction to preserve the same operating contract.

---

## 4. Agent Prompts

### 4.1 Investor Prompt
The Investor persona evaluates business viability and commercial constraints.

Responsibilities:
- Review the idea for market fit and value proposition.
- Define constraints around budget, risk, and growth assumptions.
- Flag ideas that are too ambitious for the proposed scope.
- Produce decisions that are business-oriented and durable.

Typical outputs:
- market assumptions
- target customer framing
- pricing posture
- budget constraints

### 4.2 Product Manager Prompt
The Product Manager persona defines user experience, feature focus, and product strategy.

Responsibilities:
- Translate the investor's constraints into a realistic product roadmap.
- Clarify the core user problem and the must-have experience.
- Propose a scoped feature set that fits the blueprint's ambition level.
- Revise scope when the Tech Lead or Investor exposes cost or feasibility concerns.

### 4.3 Tech Lead Prompt
The Tech Lead persona evaluates feasibility and technical architecture.

Responsibilities:
- Select implementation strategies that align with the product and investor constraints.
- Recommend architecture, data model, and deployment choices.
- Highlight trade-offs and explain why one option is preferred over another.
- Negotiate technical scope when the PM or Investor proposes something too expensive.

### 4.4 Consistency Check Prompt
The Consistency Check layer reviews the current state for contradictions.

Responsibilities:
- Compare the latest agent output with prior decisions.
- Identify conflicts between business, product, and technical choices.
- Decide whether the graph should continue debating, force convergence, or route to a manual review state.

---

## 5. Decision Extraction Prompt

The Decision Extraction Prompt is used after a debate round or after convergence.

It instructs the extractor to:
- identify durable commitments rather than casual opinions
- emit structured decisions with key, value, rationale, and ownership
- avoid recording stylistic or temporary commentary as decisions
- classify whether the decision is a strong commitment or a soft preference

This prompt is intentionally strict so the decision memory stays small and useful.

---

## 6. Regeneration Prompt

The Regeneration Prompt is used when the user rewrites or edits a section.

It is composed with:
- the selected section context
- the existing section version content
- the relevant active decisions
- the user request
- any dependency information for related decisions

The prompt instructs the model to:
- preserve prior commitments unless the user deliberately overrides them
- keep the revised section aligned with the blueprint's architecture
- raise a conflict error when the request would break an existing decision

---

## 7. Conflict Resolution Prompt

The Conflict Resolution Prompt is used when a proposed change conflicts with an older decision.

It asks the runtime to:
- describe the conflict clearly
- determine whether the override is acceptable
- decide whether the conflict should block generation or produce a review prompt
- preserve the chain of evidence in the debate history

This prompt is used for both automated conflict handling and user-facing review flows.

---

## 8. Prompt Composition Pipeline

The prompt assembly pipeline is:

1. **Load base runtime context** from the blueprint state.
2. **Inject the current idea and any normalized constraints**.
3. **Add the conversation memory** for the current turn.
4. **Inject the active decision memory** for the blueprint.
5. **Append the relevant pending decisions and conflicts**.
6. **Add the specific agent instruction** for the current node.
7. **Attach the output schema** for structured response parsing.
8. **Send the final prompt to the LLM provider** and capture the result.

This ordering ensures that the model sees both the long-term blueprint commitments and the immediate task before generating content.

---

## 9. Context Injection Order

The context injection order is intentionally deterministic:

1. `idea`
2. `blueprint_context`
3. `messages`
4. `constraints`
5. `active_decisions`
6. `pending_decisions`
7. `conflicts`
8. `user_request` or section rewrite instructions
9. `output_schema`

This order keeps the most stable context first and the most immediate instruction last.

---

## 10. Decision Memory Injection

Decision memory is injected as a compact, structured block at the top of the prompt.

Example:

```text
ACTIVE_DECISIONS
- primary_database: PostgreSQL
- backend_framework: Django
- authentication: JWT-based authentication
```

The injection is not a free-form summary. It is a structured commitment block that the model must honor unless the user explicitly overrides it.

---

## 11. Token Budgeting

Token budgeting is important because the debate runs in a streaming, long-running environment.

| Prompt Type | Approximate Budget | Purpose |
| :--- | :--- | :--- |
| System Prompt | 1,000–2,000 tokens | Shared runtime contract |
| Investor Prompt | 2,000–4,000 tokens | Business and market reasoning |
| Product Manager Prompt | 2,000–4,000 tokens | Feature and product framing |
| Tech Lead Prompt | 2,000–4,000 tokens | Architecture and feasibility |
| Consistency Check | 1,500–2,500 tokens | Conflict detection |
| Decision Extraction | 1,500–2,500 tokens | Structured decision extraction |
| Regeneration Prompt | 2,500–4,500 tokens | Section-specific rewrite with memory |

The budget is intentionally larger for regeneration because it must include both the prior commitments and the section-specific content being edited.

---

## 12. Related Documents

- [Design.md](Design.md)
- [Decision_Memory_Architecture.md](Decision_Memory_Architecture.md)
- [App_Flow.md](App_Flow.md)
