from django.conf import settings
from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from ..state import StrategyRoomState
from ..prompts import INVESTOR_PROMPT, SYSTEM_PROMPT

def investor_node(state: StrategyRoomState) -> dict:
    provider = GeminiProvider()

    idea = state.get('idea', '')
    blueprint_context = str(state.get('blueprint_context', {}))
    messages_str = "\n".join([f"{msg['sender']}: {msg['content']}" for msg in state.get('messages', [])])
    constraints_str = ", ".join(state.get('constraints', []))
    active_decisions_str = "\n".join([f"- {d['key']}: {d['value']}" for d in state.get('decisions', [])])

    prompt = INVESTOR_PROMPT.format(
        idea=idea,
        blueprint_context=blueprint_context,
        messages=messages_str,
        constraints=constraints_str,
        active_decisions=active_decisions_str
    )

    response_text = provider.generate(prompt, system_instruction=SYSTEM_PROMPT)

    new_constraints = state.get('constraints', []).copy()
    if not any("budget_limit" in c for c in new_constraints):
        new_constraints.append("budget_limit: 10000 USD")

    messages = state.get('messages', []).copy()
    messages.append({"sender": "Investor", "content": response_text})

    debate_history = state.get('debate_history', []).copy()
    debate_history.append({"agent": "Investor", "action": "Evaluated market fit", "details": response_text[:100]})

    agent_outputs = state.get('agent_outputs', {}).copy()
    agent_outputs['Investor'] = response_text

    return {
        "messages": messages,
        "debate_history": debate_history,
        "agent_outputs": agent_outputs,
        "constraints": new_constraints,
        "current_agent": "Investor"
    }
