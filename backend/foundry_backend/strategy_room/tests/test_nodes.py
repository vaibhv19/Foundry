import pytest
from unittest.mock import MagicMock, patch

from foundry_backend.strategy_room.state import StrategyRoomState
from foundry_backend.strategy_room.nodes.investor import investor_node
from foundry_backend.strategy_room.nodes.pm import pm_node
from foundry_backend.strategy_room.nodes.tech_lead import tech_lead_node
from foundry_backend.strategy_room.nodes.consistency import consistency_check_node, ConflictAnalysis, ConflictItem
from foundry_backend.strategy_room.nodes.tie_breaker import tie_breaker_node

@pytest.fixture
def base_state():
    return {
        "idea": "An AI startup idea",
        "messages": [],
        "agent_outputs": {},
        "debate_history": [],
        "constraints": [],
        "conflicts": [],
        "resolved_conflicts": [],
        "decisions": [],
        "pending_decisions": [],
        "current_agent": "",
        "confidence_scores": {},
        "iteration_count": 0,
        "blueprint_context": {}
    }


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
def test_investor_node(mock_generate_stream, base_state):
    mock_generate_stream.return_value = ["Investor Response Text"]

    res = investor_node(base_state)
    assert res["current_agent"] == "Investor"
    assert "budget_limit" in "".join(res["constraints"])
    assert res["agent_outputs"]["Investor"] == "Investor Response Text"
    assert res["messages"][-1] == {"sender": "Investor", "content": "Investor Response Text"}


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
def test_pm_node(mock_generate_stream, base_state):
    mock_generate_stream.return_value = ["PM Response Text"]

    res = pm_node(base_state)
    assert res["current_agent"] == "Product_Manager"
    assert res["agent_outputs"]["Product_Manager"] == "PM Response Text"
    assert res["messages"][-1] == {"sender": "Product_Manager", "content": "PM Response Text"}


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
def test_tech_lead_node(mock_generate_stream, base_state):
    mock_generate_stream.return_value = ["Tech Lead Response Text"]

    res = tech_lead_node(base_state)
    assert res["current_agent"] == "Tech_Lead"
    assert res["agent_outputs"]["Tech_Lead"] == "Tech Lead Response Text"
    assert res["messages"][-1] == {"sender": "Tech_Lead", "content": "Tech Lead Response Text"}


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
def test_consistency_check_node(mock_gen_struct, base_state):
    mock_conflict = ConflictItem(key="database", description="Contradictory databases selected", severity="HIGH")
    mock_analysis = ConflictAnalysis(has_conflicts=True, conflicts=[mock_conflict])
    mock_gen_struct.return_value = mock_analysis

    res = consistency_check_node(base_state)
    assert res["current_agent"] == "Consistency_Check"
    assert len(res["conflicts"]) == 1
    assert res["conflicts"][0]["key"] == "database"
    assert res["iteration_count"] == 1


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
def test_tie_breaker_node(mock_generate_stream, base_state):
    mock_generate_stream.return_value = ["Tie Breaker Response Text"]
    base_state["conflicts"] = [{"key": "database", "description": "some conflict"}]

    res = tie_breaker_node(base_state)
    assert res["current_agent"] == "Tie_Breaker"
    assert res["conflicts"] == []
    assert res["agent_outputs"]["Tie_Breaker"] == "Tie Breaker Response Text"
