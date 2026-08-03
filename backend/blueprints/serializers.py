from rest_framework import serializers
from .models import Blueprint, Section, Version, Idea, Export

class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = ('id', 'version_number', 'content_markdown', 'is_active', 'created_at', 'agent_run', 'job')

class SectionSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='get_category_display', read_only=True)
    latest_content = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ('id', 'title', 'category', 'latest_content', 'version_count', 'sort_order')

    def get_latest_content(self, obj):
        active_version = obj.versions.filter(is_active=True).first()
        if active_version:
            return active_version.content_markdown
        latest_version = obj.versions.first()
        if latest_version:
            return latest_version.content_markdown
        return ""

    def get_version_count(self, obj):
        return obj.versions.count()

class BlueprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blueprint
        fields = ('id', 'title', 'status', 'created_at')

class BlueprintDetailSerializer(serializers.ModelSerializer):
    idea_raw = serializers.CharField(source='idea.raw_text', read_only=True)
    sections = SectionSerializer(many=True, read_only=True)

    class Meta:
        model = Blueprint
        fields = ('id', 'title', 'status', 'idea_raw', 'sections', 'created_at')

class ExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Export
        fields = ('id', 'blueprint', 'format', 'storage_path', 'created_at')
