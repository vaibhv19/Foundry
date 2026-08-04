from django.db import transaction
from blueprints.models import DecisionLog, GenerationEvent, Version
from .graph import DependencyGraphTraverser

class DecisionMemoryEngine:
    @staticmethod
    def retrieve_context_block(blueprint_id: str) -> str:
        decisions = DecisionLog.objects.filter(blueprint_id=blueprint_id, is_active=True)
        if not decisions.exists():
            return "ACTIVE_DECISIONS\n(No active decisions made yet.)"

        lines = ["ACTIVE_DECISIONS"]
        for dec in decisions:
            lines.append(f"- {dec.decision_key}: {dec.choice_value}")

        return "\n".join(lines)

    @staticmethod
    def apply_override(decision_id: str, choice_value: str, rationale: str) -> DecisionLog:
        with transaction.atomic():
            try:
                decision = DecisionLog.objects.get(id=decision_id, is_active=True)
            except DecisionLog.DoesNotExist:
                raise ValueError(f"Active decision with ID {decision_id} does not exist.")

            decision.is_active = False
            decision.save()

            new_decision = DecisionLog.objects.create(
                blueprint=decision.blueprint,
                created_by_version=decision.created_by_version,
                node_origin="MANUAL_OVERRIDE",
                decision_key=decision.decision_key,
                choice_value=choice_value,
                rationale=rationale,
                supersedes=decision,
                is_active=True,
                priority=decision.priority
            )

            impacted_keys = DependencyGraphTraverser.get_downstream_impact(
                blueprint_id=str(decision.blueprint.id),
                changed_key=decision.decision_key
            )

            if impacted_keys:
                DecisionLog.objects.filter(
                    blueprint=decision.blueprint,
                    decision_key__in=impacted_keys,
                    is_active=True
                ).update(is_active=False)

            # Record manual override event in generation_events table
            GenerationEvent.objects.create(
                blueprint=decision.blueprint,
                event_type="MANUAL_OVERRIDE",
                details={
                    "override_decision_id": str(new_decision.id),
                    "overridden_key": decision.decision_key,
                    "new_value": choice_value,
                    "deactivated_dependent_keys": impacted_keys
                }
            )

            return new_decision

    @staticmethod
    def get_downstream_impact(blueprint_id: str, changed_key: str) -> list:
        return DependencyGraphTraverser.get_downstream_impact(blueprint_id, changed_key)

    @staticmethod
    def rollback_to_version(version_id: str):
        with transaction.atomic():
            try:
                target_version = Version.objects.get(id=version_id)
            except Version.DoesNotExist:
                raise ValueError(f"Version with ID {version_id} does not exist.")

            # Sibling versions of the section set to inactive, target version to active
            Version.objects.filter(section=target_version.section).update(is_active=False)
            target_version.is_active = True
            target_version.save()

            blueprint = target_version.section.blueprint

            # Deactivate all active decisions that were created after target_version.created_at
            DecisionLog.objects.filter(
                blueprint=blueprint,
                created_at__gt=target_version.created_at,
                is_active=True
            ).update(is_active=False)

            # Reactivate historical decisions that were active when target_version was created
            historical_decisions = DecisionLog.objects.filter(
                blueprint=blueprint,
                created_at__lte=target_version.created_at
            )

            for dec in historical_decisions:
                was_superseded_then = DecisionLog.objects.filter(
                    supersedes=dec,
                    created_at__lte=target_version.created_at
                ).exists()

                if not was_superseded_then:
                    dec.is_active = True
                    dec.save()
                else:
                    dec.is_active = False
                    dec.save()

