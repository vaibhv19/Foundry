from django.db import transaction
from blueprints.models import DecisionLog
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

            return new_decision

    @staticmethod
    def get_downstream_impact(blueprint_id: str, changed_key: str) -> list:
        return DependencyGraphTraverser.get_downstream_impact(blueprint_id, changed_key)
