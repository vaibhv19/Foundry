import uuid
from django.db import models
from django.conf import settings

class BlueprintStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    QUEUED = 'QUEUED', 'Queued'
    GENERATING = 'GENERATING', 'Generating'
    PARTIALLY_GENERATED = 'PARTIALLY_GENERATED', 'Partially Generated'
    READY = 'READY', 'Ready'
    EDITING = 'EDITING', 'Editing'
    EXPORTING = 'EXPORTING', 'Exporting'
    ARCHIVED = 'ARCHIVED', 'Archived'
    FAILED = 'FAILED', 'Failed'
    DELETED = 'DELETED', 'Deleted'

class SectionCategory(models.TextChoices):
    MARKET = 'MARKET', 'Market Analysis'
    PRODUCT = 'PRODUCT', 'Product Specification'
    TECH_STACK = 'TECH_STACK', 'Technical Architecture'
    BUSINESS = 'BUSINESS', 'Business Model'

class JobTaskType(models.TextChoices):
    GENERATE = 'GENERATE', 'Generate Blueprint'
    REGENERATE = 'REGENERATE', 'Regenerate Section'

class JobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    STARTED = 'STARTED', 'Started'
    SUCCESS = 'SUCCESS', 'Success'
    FAILURE = 'FAILURE', 'Failure'

class AgentRunType(models.TextChoices):
    DEBATE = 'DEBATE', 'Multi-Agent Debate'
    REWRITE = 'REWRITE', 'Section Rewrite'

class AgentRunStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class ExportFormat(models.TextChoices):
    MARKDOWN = 'MARKDOWN', 'Markdown'
    PDF = 'PDF', 'PDF'


class Idea(models.Model):
    raw_text = models.TextField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ideas')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Idea {self.id} for {self.user.email}"


class BlueprintManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class Blueprint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blueprints')
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name='blueprints')
    title = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=BlueprintStatus.choices,
        default=BlueprintStatus.DRAFT,
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = BlueprintManager()
    all_objects = models.Manager()

    def __str__(self):
        return self.title


class Section(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blueprint = models.ForeignKey(Blueprint, on_delete=models.CASCADE, related_name='sections')
    category = models.CharField(
        max_length=20,
        choices=SectionCategory.choices,
    )
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order']
        unique_together = ('blueprint', 'category')

    def __str__(self):
        return f"{self.category} for {self.blueprint.title}"


class Version(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField(default=1)
    content_markdown = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Audit columns
    agent_run = models.ForeignKey('AgentRun', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')
    job = models.ForeignKey('Job', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')

    class Meta:
        ordering = ['-version_number']

    def save(self, *args, **kwargs):
        if not self.version_number:
            # Enforce auto-increment of version_number based on existing versions for this section
            existing_versions = Version.objects.filter(section=self.section)
            if existing_versions.exists():
                max_ver = existing_versions.aggregate(models.Max('version_number'))['version_number__max']
                self.version_number = max_ver + 1
            else:
                self.version_number = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.section.category} v{self.version_number} (Active: {self.is_active})"


class Job(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blueprint = models.ForeignKey(Blueprint, on_delete=models.CASCADE, related_name='jobs')
    target_section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs')
    task_type = models.CharField(
        max_length=20,
        choices=JobTaskType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.PENDING,
    )
    current_node = models.CharField(max_length=100, blank=True)
    error_log = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Job {self.id} ({self.task_type} - {self.status})"


class AgentRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blueprint = models.ForeignKey(Blueprint, on_delete=models.CASCADE, related_name='agent_runs')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='agent_runs')
    run_type = models.CharField(
        max_length=20,
        choices=AgentRunType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=AgentRunStatus.choices,
        default=AgentRunStatus.ACTIVE,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"AgentRun {self.id} ({self.run_type} - {self.status})"


class AgentMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent_run = models.ForeignKey(AgentRun, on_delete=models.CASCADE, related_name='messages')
    agent_name = models.CharField(max_length=100)
    message_type = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.agent_name} in Run {self.agent_run.id}"


class Export(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blueprint = models.ForeignKey(Blueprint, on_delete=models.CASCADE, related_name='exports')
    format = models.CharField(
        max_length=10,
        choices=ExportFormat.choices,
    )
    storage_path = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Export {self.id} ({self.format}) for {self.blueprint.title}"
