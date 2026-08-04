from langgraph.graph import StateGraph, START, END
from .state import StrategyRoomState
from .nodes.investor import investor_node
from .nodes.pm import pm_node
from .nodes.tech_lead import tech_lead_node
from .nodes.consistency import consistency_check_node
from .nodes.tie_breaker import tie_breaker_node

builder = StateGraph(StrategyRoomState)

builder.add_node("Investor", investor_node)
builder.add_node("Product_Manager", pm_node)
builder.add_node("Tech_Lead", tech_lead_node)
builder.add_node("Consistency_Check", consistency_check_node)
builder.add_node("Tie_Breaker", tie_breaker_node)

builder.add_edge(START, "Investor")
builder.add_edge("Investor", "Product_Manager")
builder.add_edge("Product_Manager", "Tech_Lead")
builder.add_edge("Tech_Lead", "Consistency_Check")

def route_after_consistency(state: StrategyRoomState) -> str:
    conflicts = state.get("conflicts", [])
    iteration_count = state.get("iteration_count", 0)

    if not conflicts:
        return END

    if iteration_count < 5:
        return "Investor"

    return "Tie_Breaker"

builder.add_conditional_edges(
    "Consistency_Check",
    route_after_consistency,
    {
        END: END,
        "Investor": "Investor",
        "Tie_Breaker": "Tie_Breaker"
    }
)

builder.add_edge("Tie_Breaker", END)

compiled_graph = builder.compile()
