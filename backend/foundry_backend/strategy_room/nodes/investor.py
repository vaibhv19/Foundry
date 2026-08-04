from django.conf import settings
from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from ..state import StrategyRoomState
from ..prompts import INVESTOR_PROMPT, SYSTEM_PROMPT
from ..publisher import publish_event

def investor_node(state: StrategyRoomState) -> dict:
    provider = GeminiProvider()

    blueprint_id = state.get('blueprint_context', {}).get('blueprint_id')
    if blueprint_id:
        publish_event(blueprint_id, 'NODE_STARTED', {"node": "Investor"})

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

    response_chunks = []
    try:
        stream = provider.generate_stream(prompt, system_instruction=SYSTEM_PROMPT)
        for chunk in stream:
            response_chunks.append(chunk)
            if blueprint_id:
                publish_event(blueprint_id, 'TOKEN', {"node": "Investor", "token": chunk})
        response_text = "".join(response_chunks)
    except Exception as e:
        if blueprint_id:
            publish_event(blueprint_id, 'ERROR', {"node": "Investor", "error": str(e)})
        raise e

    if blueprint_id:
        publish_event(blueprint_id, 'NODE_COMPLETED', {"node": "Investor"})

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

