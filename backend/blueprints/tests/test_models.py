import pytest
from django.contrib.auth import get_user_model
from blueprints.models import Idea, Blueprint, Section, Version, SectionCategory

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
def test_section(test_blueprint):
    return Section.objects.create(
        blueprint=test_blueprint,
        category=SectionCategory.TECH_STACK,
        sort_order=1
    )

@pytest.mark.django_db
def test_version_auto_increment(test_section):
    # 1. Create first version (should default to 1)
    v1 = Version.objects.create(
        section=test_section,
        content_markdown='First version content',
        is_active=True
    )
    assert v1.version_number == 1

    # 2. Create second version (should auto-increment to 2)
    v2 = Version.objects.create(
        section=test_section,
        content_markdown='Second version content',
        is_active=True
    )
    assert v2.version_number == 2

    # 3. Create third version (should auto-increment to 3)
    v3 = Version.objects.create(
        section=test_section,
        content_markdown='Third version content',
        is_active=True
    )
    assert v3.version_number == 3
