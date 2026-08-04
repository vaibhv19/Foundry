import os
from django.db import transaction
from django.conf import settings
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import (
    Blueprint, Section, Version, Idea, Export,
    BlueprintStatus, SectionCategory, ExportFormat
)
from .serializers import (
    BlueprintSerializer, BlueprintDetailSerializer,
    SectionSerializer, VersionSerializer, ExportSerializer
)

class BlueprintViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BlueprintDetailSerializer
        return BlueprintSerializer

    def get_queryset(self):
        return Blueprint.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        raw_text = request.data.get('raw_text')
        if not raw_text:
            return Response({"raw_text": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create Idea
        idea = Idea.objects.create(raw_text=raw_text, user=request.user)

        # 2. Create Blueprint
        title = f"Blueprint: {raw_text[:30]}..." if len(raw_text) > 30 else f"Blueprint: {raw_text}"
        blueprint = Blueprint.objects.create(
            user=request.user,
            idea=idea,
            title=title,
            status=BlueprintStatus.QUEUED
        )

        from foundry_backend.strategy_room.tasks import run_strategy_debate
        run_strategy_debate.delay(str(blueprint.id))

        return Response({"blueprint_id": str(blueprint.id)}, status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"deleted": True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'])
    def rename(self, request, pk=None):
        blueprint = self.get_object()
        title = request.data.get('title')
        if not title:
            return Response({"title": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        blueprint.title = title
        blueprint.save()
        serializer = BlueprintDetailSerializer(blueprint)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        blueprint = self.get_object()

        with transaction.atomic():
            new_blueprint = Blueprint.objects.create(
                user=blueprint.user,
                idea=blueprint.idea,
                title=f"{blueprint.title} (Copy)",
                status=BlueprintStatus.DRAFT,
            )

            for section in blueprint.sections.all():
                new_section = Section.objects.create(
                    blueprint=new_blueprint,
                    category=section.category,
                    sort_order=section.sort_order
                )

                active_versions = section.versions.filter(is_active=True)
                for ver in active_versions:
                    Version.objects.create(
                        section=new_section,
                        version_number=ver.version_number,
                        content_markdown=ver.content_markdown,
                        is_active=True,
                        agent_run=ver.agent_run,
                        job=ver.job
                    )

        return Response({"blueprint_id": str(new_blueprint.id)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def override_decision(self, request, pk=None):
        decision_id = request.data.get('decision_id')
        choice_value = request.data.get('choice_value')
        rationale = request.data.get('rationale', 'Manual override via interface.')

        if not decision_id or not choice_value:
            return Response({"error": "decision_id and choice_value are required."}, status=status.HTTP_400_BAD_REQUEST)

        from foundry_backend.decision_memory.engine import DecisionMemoryEngine
        DecisionMemoryEngine.apply_override(decision_id, choice_value, rationale)

        blueprint = self.get_object()
        serializer = BlueprintDetailSerializer(blueprint)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SectionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SectionSerializer

    def get_queryset(self):
        return Section.objects.filter(blueprint__user=self.request.user)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        section = self.get_object()
        versions = section.versions.all()
        serializer = VersionSerializer(versions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        section = self.get_object()
        user_note = request.data.get('user_note', '')
        enforce_previous_decisions = request.data.get('enforce_previous_decisions', True)

        from foundry_backend.strategy_room.tasks import run_section_regeneration
        task = run_section_regeneration.delay(
            section_id=str(section.id),
            user_note=user_note,
            enforce_previous_decisions=enforce_previous_decisions
        )
        return Response({
            "task_id": task.id,
            "status": "QUEUED"
        }, status=status.HTTP_202_ACCEPTED)


class VersionViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = VersionSerializer

    def get_queryset(self):
        return Version.objects.filter(section__blueprint__user=self.request.user)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        version = self.get_object()
        from foundry_backend.decision_memory.engine import DecisionMemoryEngine
        DecisionMemoryEngine.rollback_to_version(str(version.id))

        version.refresh_from_db()
        serializer = VersionSerializer(version)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Blueprint.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def trigger(self, request, pk=None):
        blueprint = self.get_object()

        sections = blueprint.sections.all().order_by('sort_order')

        document_content = f"# {blueprint.title}\n\n"
        for section in sections:
            active_version = section.versions.filter(is_active=True).first()
            content = active_version.content_markdown if active_version else "*(No content generated)*"
            document_content += f"## {section.get_category_display()}\n\n{content}\n\n"

        media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
        os.makedirs(media_root, exist_ok=True)

        filename = f"blueprint_{blueprint.id}.md"
        filepath = os.path.join(media_root, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(document_content)

        export_format = request.data.get('format', ExportFormat.MARKDOWN)
        if export_format not in [ExportFormat.MARKDOWN, ExportFormat.PDF]:
            export_format = ExportFormat.MARKDOWN

        Export.objects.create(
            blueprint=blueprint,
            format=export_format,
            storage_path=filepath
        )

        download_url = f"http://localhost:8000/api/v1/exports/{blueprint.id}/download/"
        return Response({"export_url": download_url}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        blueprint = self.get_object()
        latest_export = blueprint.exports.all().order_by('-created_at').first()
        if not latest_export or not os.path.exists(latest_export.storage_path):
            return Response({"error": "Export file not found."}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(open(latest_export.storage_path, 'rb'), content_type='text/markdown')
        response['Content-Disposition'] = f'attachment; filename="blueprint_{blueprint.id}.md"'
        return response
