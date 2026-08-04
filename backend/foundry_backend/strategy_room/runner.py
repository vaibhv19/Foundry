from django.db import transaction
from blueprints.models import Blueprint, Section, Version, SectionCategory
from .graph import compiled_graph
from .state import StrategyRoomState

class GraphRunner:
    @staticmethod
    def run_initial_debate(blueprint_id: str) -> dict:
        try:
            blueprint = Blueprint.objects.get(id=blueprint_id)
        except Blueprint.DoesNotExist:
            raise ValueError(f"Blueprint with ID {blueprint_id} does not exist.")

        idea = blueprint.idea

        initial_state: StrategyRoomState = {
            "idea": idea.raw_text,
            "messages": [],
            "agent_outputs": {},
            "debate_history": [],
            "constraints": [],
            "conflicts": [],
            "resolved_conflicts": [],
            "decisions": [],
            "pending_decisions": [],
            "current_agent": "",
            "confidence_scores": {},
            "iteration_count": 0,
            "blueprint_context": {
                "blueprint_id": str(blueprint.id),
                "title": blueprint.title
            }
        }

        final_state = compiled_graph.invoke(initial_state)

        # Persist debate outputs to the database
        investor_content = final_state['agent_outputs'].get('Investor', 'No business design generated.')
        pm_content = final_state['agent_outputs'].get('Product_Manager', 'No feature specification generated.')
        tech_lead_content = final_state['agent_outputs'].get('Tech_Lead', 'No technical architecture generated.')

        category_contents = {
            SectionCategory.BUSINESS: investor_content,
            SectionCategory.PRODUCT: pm_content,
            SectionCategory.TECH_STACK: tech_lead_content,
            SectionCategory.MARKET: "Market validation and budget limits established:\n\n" + "\n".join(f"- {c}" for c in final_state.get('constraints', []))
        }

        with transaction.atomic():
            for category, content in category_contents.items():
                section, created = Section.objects.get_or_create(
                    blueprint=blueprint,
                    category=category,
                    defaults={'sort_order': list(SectionCategory).index(category)}
                )

                # Set all previous versions for this section to inactive
                Version.objects.filter(section=section).update(is_active=False)

                # Create the new active version
                Version.objects.create(
                    section=section,
                    content_markdown=content,
                    is_active=True
                )

            blueprint.status = "READY"
            blueprint.save()

        return final_state
