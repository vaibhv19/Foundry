import pytest
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, DecisionLog, Section, Version, SectionCategory
from foundry_backend.decision_memory.engine import DecisionMemoryEngine
from foundry_backend.decision_memory.models import DecisionDependency

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser3@example.com',
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
def test_section(test_blueprint):
    return Section.objects.create(
        blueprint=test_blueprint,
        category=SectionCategory.TECH_STACK
    )

@pytest.fixture
def test_version(test_section):
    return Version.objects.create(
        section=test_section,
        content_markdown="Content",
        is_active=True
    )

@pytest.mark.django_db
def test_engine_retrieve_context_block(test_blueprint, test_version):
    block = DecisionMemoryEngine.retrieve_context_block(str(test_blueprint.id))
    assert "No active decisions" in block

    DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=test_version,
        node_origin="Tech_Lead",
        decision_key="database",
        choice_value="PostgreSQL",
        is_active=True
    )

    block = DecisionMemoryEngine.retrieve_context_block(str(test_blueprint.id))
    assert "database" in block
    assert "PostgreSQL" in block


@pytest.mark.django_db
def test_engine_apply_override_cascading(test_blueprint, test_version):
    parent_dec = DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=test_version,
        node_origin="Tech_Lead",
        decision_key="database",
        choice_value="PostgreSQL",
        priority="P0",
        is_active=True
    )

    child_dec = DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=test_version,
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

    new_dec = DecisionMemoryEngine.apply_override(
        decision_id=str(parent_dec.id),
        choice_value="MySQL",
        rationale="Cost constraints require MySQL"
    )

    assert new_dec.is_active is True
    assert new_dec.choice_value == "MySQL"
    assert new_dec.supersedes == parent_dec

    parent_dec.refresh_from_db()
    assert parent_dec.is_active is False

    child_dec.refresh_from_db()
    assert child_dec.is_active is False
