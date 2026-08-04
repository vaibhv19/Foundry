from django.conf import settings
from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from ..state import StrategyRoomState
from ..prompts import PM_PROMPT, SYSTEM_PROMPT
from ..publisher import publish_event

def pm_node(state: StrategyRoomState) -> dict:
    provider = GeminiProvider()

    blueprint_id = state.get('blueprint_context', {}).get('blueprint_id')
    if blueprint_id:
        publish_event(blueprint_id, 'NODE_STARTED', {"node": "Product_Manager"})

    idea = state.get('idea', '')
    blueprint_context = str(state.get('blueprint_context', {}))
    messages_str = "\n".join([f"{msg['sender']}: {msg['content']}" for msg in state.get('messages', [])])
    constraints_str = ", ".join(state.get('constraints', []))
    active_decisions_str = "\n".join([f"- {d['key']}: {d['value']}" for d in state.get('decisions', [])])
    pending_decisions_str = "\n".join([f"- {pd['key']}: {pd['value']}" for pd in state.get('pending_decisions', [])])
    conflicts_str = str(state.get('conflicts', []))

    prompt = PM_PROMPT.format(
        idea=idea,
        blueprint_context=blueprint_context,
        messages=messages_str,
        constraints=constraints_str,
        active_decisions=active_decisions_str,
        pending_decisions=pending_decisions_str,
        conflicts=conflicts_str
    )

    response_chunks = []
    try:
        stream = provider.generate_stream(prompt, system_instruction=SYSTEM_PROMPT)
        for chunk in stream:
            response_chunks.append(chunk)
            if blueprint_id:
                publish_event(blueprint_id, 'TOKEN', {"node": "Product_Manager", "token": chunk})
        response_text = "".join(response_chunks)
    except Exception as e:
        if blueprint_id:
            publish_event(blueprint_id, 'ERROR', {"node": "Product_Manager", "error": str(e)})
        raise e

    if blueprint_id:
        publish_event(blueprint_id, 'NODE_COMPLETED', {"node": "Product_Manager"})

    messages = state.get('messages', []).copy()
    messages.append({"sender": "Product_Manager", "content": response_text})

    debate_history = state.get('debate_history', []).copy()
    debate_history.append({"agent": "Product_Manager", "action": "Defined features", "details": response_text[:100]})

    agent_outputs = state.get('agent_outputs', {}).copy()
    agent_outputs['Product_Manager'] = response_text

    return {
        "messages": messages,
        "debate_history": debate_history,
        "agent_outputs": agent_outputs,
        "current_agent": "Product_Manager"
    }

