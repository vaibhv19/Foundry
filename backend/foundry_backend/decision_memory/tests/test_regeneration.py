import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, Section, Version, DecisionLog, SectionCategory
from foundry_backend.strategy_room.tasks import run_section_regeneration
from foundry_backend.ai_engine.exceptions import ConsistencyViolationError
from foundry_backend.decision_memory.models import DecisionDependency
from foundry_backend.decision_memory.schemas import DecisionExtractionResult
from foundry_backend.strategy_room.nodes.consistency import ConflictAnalysis

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='regenuser@example.com',
        password='password123',
        name='Regen User'
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
        title='Regen Blueprint'
    )

@pytest.fixture
def test_section(test_blueprint):
    return Section.objects.create(
        blueprint=test_blueprint,
        category=SectionCategory.TECH_STACK
    )

@pytest.fixture
def test_version(test_section):
    return Version.objects.create(
        section=test_section,
        content_markdown="Primary DB is PostgreSQL.",
        is_active=True
    )

@pytest.fixture
def active_decision(test_blueprint, test_version):
    return DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=test_version,
        node_origin="Tech_Lead",
        decision_key="database",
        choice_value="PostgreSQL",
        priority="P0",
        is_active=True
    )

@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
@patch('foundry_backend.strategy_room.tasks.publish_event')
@pytest.mark.django_db(transaction=True)
def test_regeneration_consistency_enforcement_failure(mock_publish, mock_gen_struct, mock_generate_stream, test_section, active_decision):
    mock_generate_stream.return_value = ["Regenerated: Primary DB is MySQL."]

    mock_gen_struct.side_effect = [
        ConflictAnalysis(has_conflicts=False, conflicts=[]),
        DecisionExtractionResult(decisions=[{
            "category": "TECH_STACK",
            "decision_key": "database",
            "choice_value": "MySQL",
            "rationale": "Better scaling",
            "priority": "P0"
        }])
    ]

    with pytest.raises(ConsistencyViolationError):
        run_section_regeneration.apply(args=[str(test_section.id), "Change database", True]).get()

    assert Version.objects.filter(section=test_section, is_active=True).count() == 1
    assert Version.objects.filter(section=test_section, is_active=True).first().content_markdown == "Primary DB is PostgreSQL."

    active_decision.refresh_from_db()
    assert active_decision.is_active is True
    assert active_decision.choice_value == "PostgreSQL"


@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
@patch('foundry_backend.strategy_room.tasks.publish_event')
@pytest.mark.django_db(transaction=True)
def test_regeneration_override_success(mock_publish, mock_gen_struct, mock_generate_stream, test_section, active_decision, test_blueprint):
    mock_generate_stream.return_value = ["Regenerated: Primary DB is MySQL."]

    mock_gen_struct.side_effect = [
        ConflictAnalysis(has_conflicts=False, conflicts=[]),
        DecisionExtractionResult(decisions=[{
            "category": "TECH_STACK",
            "decision_key": "database",
            "choice_value": "MySQL",
            "rationale": "Better scaling",
            "priority": "P0"
        }])
    ]

    child_dec = DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=active_decision.created_by_version,
        node_origin="Tech_Lead",
        decision_key="orm",
        choice_value="DjangoORM",
        priority="P1",
        is_active=True
    )

    DecisionDependency.objects.create(
        blueprint=test_blueprint,
        parent_key="database",
        child_key="orm"
    )

    res = run_section_regeneration.apply(args=[str(test_section.id), "Change database", False])
    assert res.result == "SUCCESS"

    assert Version.objects.filter(section=test_section, is_active=True).count() == 1
    new_active_version = Version.objects.filter(section=test_section, is_active=True).first()
    assert new_active_version.content_markdown == "Regenerated: Primary DB is MySQL."

    active_decision.refresh_from_db()
    assert active_decision.is_active is False

    child_dec.refresh_from_db()
    assert child_dec.is_active is False

    new_dec = DecisionLog.objects.filter(blueprint=test_blueprint, decision_key="database", is_active=True).first()
    assert new_dec is not None
    assert new_dec.choice_value == "MySQL"
