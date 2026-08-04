import uuid
from django.db import models
from blueprints.models import Blueprint

class DecisionDependency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blueprint = models.ForeignKey(Blueprint, on_delete=models.CASCADE, related_name='decision_dependencies')
    parent_key = models.CharField(max_length=100)
    child_key = models.CharField(max_length=100)

    class Meta:
        unique_together = ('blueprint', 'parent_key', 'child_key')

    def __str__(self):
        return f"{self.parent_key} -> {self.child_key} (Blueprint: {self.blueprint.title})"
