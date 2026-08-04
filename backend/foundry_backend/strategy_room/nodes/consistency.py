from pydantic import BaseModel
from typing import List
from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from ..state import StrategyRoomState
from ..prompts import CONSISTENCY_CHECK_PROMPT, SYSTEM_PROMPT

class ConflictItem(BaseModel):
    key: str
    description: str
    severity: str

class ConflictAnalysis(BaseModel):
    has_conflicts: bool
    conflicts: List[ConflictItem]

def consistency_check_node(state: StrategyRoomState) -> dict:
    provider = GeminiProvider()

    idea = state.get('idea', '')
    blueprint_context = str(state.get('blueprint_context', {}))
    messages_str = "\n".join([f"{msg['sender']}: {msg['content']}" for msg in state.get('messages', [])])
    constraints_str = ", ".join(state.get('constraints', []))
    active_decisions_str = "\n".join([f"- {d['key']}: {d['value']}" for d in state.get('decisions', [])])
    pending_decisions_str = "\n".join([f"- {pd['key']}: {pd['value']}" for pd in state.get('pending_decisions', [])])

    prompt = CONSISTENCY_CHECK_PROMPT.format(
        idea=idea,
        blueprint_context=blueprint_context,
        messages=messages_str,
        constraints=constraints_str,
        active_decisions=active_decisions_str,
        pending_decisions=pending_decisions_str
    )

    analysis = provider.generate_structured(prompt, ConflictAnalysis, system_instruction=SYSTEM_PROMPT)

    conflicts = []
    if analysis.has_conflicts:
        conflicts = [item.model_dump() if hasattr(item, 'model_dump') else item.dict() for item in analysis.conflicts]

    iteration_count = state.get('iteration_count', 0) + 1

    messages = state.get('messages', []).copy()
    status_msg = f"Consistency Check complete. Found {len(conflicts)} conflicts."
    messages.append({"sender": "Consistency_Check", "content": status_msg})

    debate_history = state.get('debate_history', []).copy()
    debate_history.append({
        "agent": "Consistency_Check",
        "action": f"Verified consistency (Iteration: {iteration_count})",
        "details": status_msg
    })

    return {
        "messages": messages,
        "debate_history": debate_history,
        "conflicts": conflicts,
        "iteration_count": iteration_count,
        "current_agent": "Consistency_Check"
    }
