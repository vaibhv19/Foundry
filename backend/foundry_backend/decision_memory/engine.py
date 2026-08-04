from blueprints.models import DecisionLog

class DecisionMemoryEngine:
    @staticmethod
    def retrieve_context_block(blueprint_id: str) -> str:
        decisions = DecisionLog.objects.filter(blueprint_id=blueprint_id, is_active=True)
        if not decisions.exists():
            return "ACTIVE_DECISIONS\n(No active decisions made yet.)"

        lines = ["ACTIVE_DECISIONS"]
        for dec in decisions:
            # Match the prompt format in Prompt_Architecture.md:
            # - key: value
            # Let's also include category or rationale if useful, but key: value is the core specification.
            lines.append(f"- {dec.decision_key}: {dec.choice_value}")

        return "\n".join(lines)
