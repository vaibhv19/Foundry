import pytest
from django.contrib.auth import get_user_model
from users.models import UserTier

User = get_user_model()

@pytest.mark.django_db
def test_create_user():
    user = User.objects.create_user(
        email='testuser@example.com',
        password='testpassword123',
        name='Test User'
    )
    assert user.email == 'testuser@example.com'
    assert user.name == 'Test User'
    assert user.tier == UserTier.FREE
    assert user.check_password('testpassword123') is True
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False

@pytest.mark.django_db
def test_create_user_no_email():
    with pytest.raises(ValueError) as exc_info:
        User.objects.create_user(
            email='',
            password='testpassword123'
        )
    assert 'The Email field must be set' in str(exc_info.value)

@pytest.mark.django_db
def test_create_superuser():
    superuser = User.objects.create_superuser(
        email='admin@example.com',
        password='adminpassword123',
        name='Admin User'
    )
    assert superuser.email == 'admin@example.com'
    assert superuser.name == 'Admin User'
    assert superuser.tier == UserTier.PREMIUM
    assert superuser.is_staff is True
    assert superuser.is_superuser is True
