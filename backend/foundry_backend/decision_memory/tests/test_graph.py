import pytest
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint
from foundry_backend.decision_memory.models import DecisionDependency
from foundry_backend.decision_memory.graph import DependencyGraphTraverser

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser2@example.com',
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

@pytest.mark.django_db
def test_dependency_traversal(test_blueprint):
    DecisionDependency.objects.create(blueprint=test_blueprint, parent_key="database", child_key="orm")
    DecisionDependency.objects.create(blueprint=test_blueprint, parent_key="orm", child_key="auth")
    DecisionDependency.objects.create(blueprint=test_blueprint, parent_key="auth", child_key="frontend")
    DecisionDependency.objects.create(blueprint=test_blueprint, parent_key="unrelated", child_key="other")

    impacted = DependencyGraphTraverser.get_downstream_impact(str(test_blueprint.id), "database")

    assert len(impacted) == 3
    assert "orm" in impacted
    assert "auth" in impacted
    assert "frontend" in impacted
    assert "other" not in impacted
