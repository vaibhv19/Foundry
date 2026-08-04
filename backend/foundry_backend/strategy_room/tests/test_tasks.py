import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, BlueprintStatus, Section
from foundry_backend.strategy_room.tasks import run_strategy_debate
from foundry_backend.strategy_room.nodes.consistency import ConflictAnalysis

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testtaskuser@example.com',
        password='password123',
        name='Task User'
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
        title='Task Blueprint'
    )

@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_stream')
@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
@patch('foundry_backend.strategy_room.tasks.publish_event')
@pytest.mark.django_db
def test_celery_task_success(mock_publish, mock_gen_struct, mock_generate_stream, test_blueprint):
    mock_generate_stream.return_value = ["Mocked Agent Response"]
    mock_gen_struct.return_value = ConflictAnalysis(has_conflicts=False, conflicts=[])

    res = run_strategy_debate.apply(args=[str(test_blueprint.id)])

    assert res.result == "SUCCESS"

    test_blueprint.refresh_from_db()
    assert test_blueprint.status == BlueprintStatus.READY

    assert Section.objects.filter(blueprint=test_blueprint).count() == 4

    mock_publish.assert_any_call(str(test_blueprint.id), 'STATUS', {"message": "Debate has started"})
    mock_publish.assert_any_call(str(test_blueprint.id), 'COMPLETE', {
        "message": "Debate completed successfully.",
        "blueprint_id": str(test_blueprint.id)
    })
