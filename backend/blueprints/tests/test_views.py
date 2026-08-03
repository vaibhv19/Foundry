import pytest
import os
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from blueprints.models import Idea, Blueprint, Section, Version, Export, SectionCategory

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser@example.com',
        password='password123',
        name='Test User'
    )

@pytest.fixture
def auth_client(api_client, test_user):
    refresh = RefreshToken.for_user(test_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

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
def test_create_blueprint(auth_client):
    url = reverse('blueprint-list')
    payload = {'raw_text': 'This is a new startup idea.'}
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert 'blueprint_id' in response.data

@pytest.mark.django_db
def test_soft_delete_blueprint(auth_client, test_blueprint):
    # Verify blueprint exists
    url = reverse('blueprint-detail', args=[test_blueprint.id])
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    # Delete blueprint (soft delete)
    response = auth_client.delete(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['deleted'] is True

    # Verify blueprint is excluded from active list/detail queries
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Assert database still has the record but flagged as deleted
    test_blueprint.refresh_from_db()
    assert test_blueprint.is_deleted is True

@pytest.mark.django_db
def test_rename_blueprint(auth_client, test_blueprint):
    url = reverse('blueprint-rename', args=[test_blueprint.id])
    payload = {'title': 'Renamed Title'}
    response = auth_client.patch(url, payload, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['title'] == 'Renamed Title'

@pytest.mark.django_db
def test_duplicate_blueprint(auth_client, test_blueprint, test_section):
    # Create active version for section
    Version.objects.create(
        section=test_section,
        content_markdown='Active section content',
        is_active=True
    )

    url = reverse('blueprint-duplicate', args=[test_blueprint.id])
    response = auth_client.post(url, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    new_uuid = response.data['blueprint_id']
    assert new_uuid != str(test_blueprint.id)

    # Verify duplicate exists and contains cloned sections and versions
    dup_blueprint = Blueprint.objects.get(id=new_uuid)
    assert dup_blueprint.title == f"{test_blueprint.title} (Copy)"
    assert dup_blueprint.sections.count() == 1
    
    dup_section = dup_blueprint.sections.first()
    assert dup_section.category == test_section.category
    assert dup_section.versions.count() == 1
    assert dup_section.versions.first().content_markdown == 'Active section content'

@pytest.mark.django_db
def test_section_versions_history(auth_client, test_section):
    # Create multiple versions
    Version.objects.create(section=test_section, content_markdown='v1', is_active=False)
    Version.objects.create(section=test_section, content_markdown='v2', is_active=True)

    url = reverse('section-versions', args=[test_section.id])
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    assert response.data[0]['content_markdown'] == 'v2' # Sorted descending

@pytest.mark.django_db
def test_version_restore(auth_client, test_section):
    v1 = Version.objects.create(section=test_section, content_markdown='v1', is_active=True)
    v2 = Version.objects.create(section=test_section, content_markdown='v2', is_active=False)

    url = reverse('version-restore', args=[v2.id])
    response = auth_client.post(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['is_active'] is True

    # Assert sibling versions were deactivated and target version is active
    v1.refresh_from_db()
    v2.refresh_from_db()
    assert v1.is_active is False
    assert v2.is_active is True

@pytest.mark.django_db
def test_mock_export_pipeline(auth_client, test_blueprint, test_section):
    Version.objects.create(
        section=test_section,
        content_markdown='Section markdown content.',
        is_active=True
    )

    url = reverse('export-trigger', args=[test_blueprint.id])
    response = auth_client.post(url, {'format': 'MARKDOWN'}, format='json')
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert 'export_url' in response.data

    # Perform GET on the download url to retrieve the file
    download_url = response.data['export_url']
    download_path = download_url.replace('http://localhost:8000', '')
    
    response = auth_client.get(download_path)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers['Content-Type'] == 'text/markdown'
    
    # Assert written file on disk exists and contains compiled structure
    export_record = Export.objects.filter(blueprint=test_blueprint).first()
    assert export_record is not None
    assert os.path.exists(export_record.storage_path) is True
    
    with open(export_record.storage_path, 'r', encoding='utf-8') as f:
        content = f.read()
        assert f"# {test_blueprint.title}" in content
        assert "## Technical Architecture" in content
        assert "Section markdown content." in content

    # Close the response to release file lock on Windows
    response.close()

    # Clean up test export file
    if os.path.exists(export_record.storage_path):
        os.remove(export_record.storage_path)
