from django.conf import settings
from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from ..state import StrategyRoomState
from ..prompts import TECH_LEAD_PROMPT, SYSTEM_PROMPT

def tech_lead_node(state: StrategyRoomState) -> dict:
    provider = GeminiProvider()

    idea = state.get('idea', '')
    blueprint_context = str(state.get('blueprint_context', {}))
    messages_str = "\n".join([f"{msg['sender']}: {msg['content']}" for msg in state.get('messages', [])])
    constraints_str = ", ".join(state.get('constraints', []))
    active_decisions_str = "\n".join([f"- {d['key']}: {d['value']}" for d in state.get('decisions', [])])
    pending_decisions_str = "\n".join([f"- {pd['key']}: {pd['value']}" for pd in state.get('pending_decisions', [])])
    conflicts_str = str(state.get('conflicts', []))

    prompt = TECH_LEAD_PROMPT.format(
        idea=idea,
        blueprint_context=blueprint_context,
        messages=messages_str,
        constraints=constraints_str,
        active_decisions=active_decisions_str,
        pending_decisions=pending_decisions_str,
        conflicts=conflicts_str
    )

    response_text = provider.generate(prompt, system_instruction=SYSTEM_PROMPT)

    messages = state.get('messages', []).copy()
    messages.append({"sender": "Tech_Lead", "content": response_text})

    debate_history = state.get('debate_history', []).copy()
    debate_history.append({"agent": "Tech_Lead", "action": "Recommended stack", "details": response_text[:100]})

    agent_outputs = state.get('agent_outputs', {}).copy()
    agent_outputs['Tech_Lead'] = response_text

    return {
        "messages": messages,
        "debate_history": debate_history,
        "agent_outputs": agent_outputs,
        "current_agent": "Tech_Lead"
    }
