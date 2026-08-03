import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_register_user_success(api_client):
    url = reverse('auth_register')
    payload = {
        'email': 'registertest@example.com',
        'password': 'password123',
        'name': 'Register Test'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert 'token' in response.data
    assert 'access' in response.data['token']
    assert 'refresh' in response.data['token']
    assert 'user' in response.data
    assert response.data['user']['email'] == 'registertest@example.com'
    assert response.data['user']['name'] == 'Register Test'
    assert response.data['user']['tier'] == 'FREE'

@pytest.mark.django_db
def test_register_user_duplicate_email(api_client):
    User.objects.create_user(
        email='duplicate@example.com',
        password='password123',
        name='Duplicate User'
    )
    url = reverse('auth_register')
    payload = {
        'email': 'duplicate@example.com',
        'password': 'password123',
        'name': 'Other Name'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'email' in response.data

@pytest.mark.django_db
def test_login_user_success(api_client):
    User.objects.create_user(
        email='logintest@example.com',
        password='password123',
        name='Login Test'
    )
    url = reverse('auth_login')
    payload = {
        'email': 'logintest@example.com',
        'password': 'password123'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert 'token' in response.data
    assert 'access' in response.data['token']
    assert 'refresh' in response.data['token']
    assert 'user' in response.data
    assert response.data['user']['email'] == 'logintest@example.com'

@pytest.mark.django_db
def test_login_user_invalid_credentials(api_client):
    User.objects.create_user(
        email='loginfail@example.com',
        password='password123',
        name='Login Fail'
    )
    url = reverse('auth_login')
    payload = {
        'email': 'loginfail@example.com',
        'password': 'wrongpassword'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
