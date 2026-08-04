import pytest
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, Section, Version, SectionCategory
from foundry_backend.strategy_room.state import StrategyRoomState
from foundry_backend.strategy_room.graph import compiled_graph
from foundry_backend.strategy_room.runner import GraphRunner
from foundry_backend.strategy_room.nodes.consistency import ConflictAnalysis, ConflictItem

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser@example.com',
        password='password123',
        name='Test User'
    )

@pytest.fixture
def test_idea(test_user):
    return Idea.objects.create(
        raw_text='A startup idea about AI.',
        user=test_user
    )

@pytest.fixture
def test_blueprint(test_user, test_idea):
    return Blueprint.objects.create(
        user=test_user,
        idea=test_idea,
        title='My Blueprint'
    )

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


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
def test_graph_negotiation_loop(mock_gen_struct, mock_generate, base_state):
    # Mock text generations
    mock_generate.return_value = "Mocked Response"

    # Mock structured consistency check to loop twice and then converge
    call_count = 0
    def mock_structured_side_effect(prompt, output_schema, system_instruction=None):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            return ConflictAnalysis(
                has_conflicts=True,
                conflicts=[ConflictItem(key="cost", description="Too expensive", severity="MEDIUM")]
            )
        else:
            return ConflictAnalysis(has_conflicts=False, conflicts=[])

    mock_gen_struct.side_effect = mock_structured_side_effect

    # Run Compiled Graph
    final_state = compiled_graph.invoke(base_state)

    # Assertions
    # Check that it looped back (iteration count should be 3)
    assert final_state["iteration_count"] == 3
    # Active conflicts should be empty (since it exited after no conflicts)
    assert final_state["conflicts"] == []
    # Tech Lead was the last node before consistency check, but current_agent is Consistency_Check
    assert final_state["current_agent"] == "Consistency_Check"


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
def test_graph_tie_breaker(mock_gen_struct, mock_generate, base_state):
    mock_generate.return_value = "Mocked Response"
    
    # Mock structured consistency check to always return conflicts
    mock_gen_struct.return_value = ConflictAnalysis(
        has_conflicts=True,
        conflicts=[ConflictItem(key="tech", description="Persistent clash", severity="HIGH")]
    )

    # Initialize state at iteration count 4
    base_state["iteration_count"] = 4

    final_state = compiled_graph.invoke(base_state)

    # Assertions
    # Since iteration count becomes 5, it should route to Tie-Breaker and clear conflicts
    assert final_state["iteration_count"] == 5
    assert final_state["current_agent"] == "Tie_Breaker"
    assert final_state["conflicts"] == []


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
@pytest.mark.django_db
def test_graph_runner(mock_gen_struct, mock_generate, test_blueprint):
    mock_generate.return_value = "Agent Output Content"
    mock_gen_struct.return_value = ConflictAnalysis(has_conflicts=False, conflicts=[])

    # Run the debate using GraphRunner
    final_state = GraphRunner.run_initial_debate(str(test_blueprint.id))

    # Check database persistence
    test_blueprint.refresh_from_db()
    assert test_blueprint.status == "READY"
    
    # Assert sections and versions are created
    sections = Section.objects.filter(blueprint=test_blueprint)
    assert sections.count() == 4
    
    for category in [SectionCategory.BUSINESS, SectionCategory.PRODUCT, SectionCategory.TECH_STACK, SectionCategory.MARKET]:
        section = sections.get(category=category)
        active_version = Version.objects.filter(section=section, is_active=True).first()
        assert active_version is not None
        assert "Agent Output Content" in active_version.content_markdown or "Market validation" in active_version.content_markdown
