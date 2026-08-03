import pytest
from django.urls import path
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from users.throttling import TierBasedRateThrottle

User = get_user_model()

class MockProtectedView(APIView):
    throttle_classes = [TierBasedRateThrottle]
    
    def get(self, request):
        return Response({"status": "ok"})

urlpatterns = [
    path('test-protected/', MockProtectedView.as_view(), name='test-protected'),
]

@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def free_user(db):
    return User.objects.create_user(
        email='free@example.com',
        password='password123',
        name='Free User',
        tier='FREE'
    )

@pytest.fixture
def premium_user(db):
    return User.objects.create_user(
        email='premium@example.com',
        password='password123',
        name='Premium User',
        tier='PREMIUM'
    )

@pytest.mark.django_db
@pytest.mark.urls('users.tests.test_throttle')
def test_free_user_throttling(api_client, free_user):
    refresh = RefreshToken.for_user(free_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    for _ in range(10):
        response = api_client.get('/test-protected/')
        assert response.status_code == status.HTTP_200_OK

    response = api_client.get('/test-protected/')
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

@pytest.mark.django_db
@pytest.mark.urls('users.tests.test_throttle')
def test_premium_user_throttling(api_client, premium_user):
    refresh = RefreshToken.for_user(premium_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    # Premium should bypass the 10 requests limit
    for _ in range(15):
        response = api_client.get('/test-protected/')
        assert response.status_code == status.HTTP_200_OK
