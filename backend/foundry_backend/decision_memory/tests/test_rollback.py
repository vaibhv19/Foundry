import pytest
import time
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, Section, Version, DecisionLog, SectionCategory
from foundry_backend.decision_memory.engine import DecisionMemoryEngine

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='rollbackuser@example.com',
        password='password123',
        name='Rollback User'
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
        title='Rollback Blueprint'
    )

@pytest.fixture
def test_section(test_blueprint):
    return Section.objects.create(
        blueprint=test_blueprint,
        category=SectionCategory.TECH_STACK
    )

@pytest.mark.django_db(transaction=True)
def test_version_rollback_transaction(test_section, test_blueprint):
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()

    v1 = Version.objects.create(
        section=test_section,
        content_markdown="Primary DB is PostgreSQL.",
        is_active=False
    )
    Version.objects.filter(id=v1.id).update(created_at=now - timedelta(minutes=10))
    v1.refresh_from_db()

    d1 = DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=v1,
        node_origin="Tech_Lead",
        decision_key="database",
        choice_value="PostgreSQL",
        is_active=False
    )
    DecisionLog.objects.filter(id=d1.id).update(created_at=now - timedelta(minutes=10))
    d1.refresh_from_db()

    v2 = Version.objects.create(
        section=test_section,
        content_markdown="Primary DB is MySQL.",
        is_active=True
    )
    Version.objects.filter(id=v2.id).update(created_at=now)
    v2.refresh_from_db()

    d2 = DecisionLog.objects.create(
        blueprint=test_blueprint,
        created_by_version=v2,
        node_origin="Tech_Lead",
        decision_key="database",
        choice_value="MySQL",
        supersedes=d1,
        is_active=True
    )
    DecisionLog.objects.filter(id=d2.id).update(created_at=now)
    d2.refresh_from_db()

    DecisionMemoryEngine.rollback_to_version(str(v1.id))

    v1.refresh_from_db()
    v2.refresh_from_db()
    assert v1.is_active is True
    assert v2.is_active is False

    d1.refresh_from_db()
    d2.refresh_from_db()
    assert d1.is_active is True
    assert d2.is_active is False
