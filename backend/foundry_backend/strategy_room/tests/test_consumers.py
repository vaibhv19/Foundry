import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from blueprints.models import Idea, Blueprint
from foundry_backend.asgi import application

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testwsuser@example.com',
        password='password123',
        name='WS User'
    )

@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='otherwsuser@example.com',
        password='password123',
        name='Other User'
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
        title='WS Blueprint'
    )

@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
async def test_websocket_consumer_auth_and_routing(test_user, other_user, test_blueprint):
    token = str(AccessToken.for_user(test_user))
    path = f"ws/strategy/{test_blueprint.id}/?token={token}"

    communicator = WebsocketCommunicator(application, path)
    connected, subprotocol = await communicator.connect()

    assert connected is True

    await communicator.send_json_to({"command": "request_state"})

    response = await communicator.receive_json_from()
    assert response["type"] == "STATUS"
    assert response["payload"]["blueprint_id"] == str(test_blueprint.id)

    await communicator.disconnect()

@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
async def test_websocket_consumer_auth_failure(other_user, test_blueprint):
    token = str(AccessToken.for_user(other_user))
    path = f"ws/strategy/{test_blueprint.id}/?token={token}"

    communicator = WebsocketCommunicator(application, path)
    connected, subprotocol = await communicator.connect()

    assert connected is False
