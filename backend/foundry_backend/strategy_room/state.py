from typing import TypedDict, List, Dict, Any

class StrategyRoomState(TypedDict):
    idea: str
    messages: List[Dict[str, Any]]
    agent_outputs: Dict[str, Any]
    debate_history: List[Dict[str, Any]]
    constraints: List[str]
    conflicts: List[Dict[str, Any]]
    resolved_conflicts: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]
    pending_decisions: List[Dict[str, Any]]
    current_agent: str
    confidence_scores: Dict[str, float]
    iteration_count: int
    blueprint_context: Dict[str, Any]
