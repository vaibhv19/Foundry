import traceback
from celery import shared_task
from blueprints.models import Blueprint, BlueprintStatus, Job, Section, Version, SectionCategory, DecisionLog
from .runner import GraphRunner
from .publisher import publish_event
from foundry_backend.decision_memory.engine import DecisionMemoryEngine
from foundry_backend.decision_memory.conflict import ConflictDetector
from foundry_backend.decision_memory.extractor import DecisionExtractor
from foundry_backend.ai_engine.exceptions import ConsistencyViolationError
from foundry_backend.strategy_room.routing_rules import AgentRouter
from foundry_backend.strategy_room.nodes.investor import investor_node
from foundry_backend.strategy_room.nodes.pm import pm_node
from foundry_backend.strategy_room.nodes.tech_lead import tech_lead_node
from foundry_backend.strategy_room.nodes.consistency import consistency_check_node
from foundry_backend.strategy_room.nodes.tie_breaker import tie_breaker_node

@shared_task(bind=True)
def run_strategy_debate(self, blueprint_id: str):
    try:
        blueprint = Blueprint.objects.get(id=blueprint_id)
    except Blueprint.DoesNotExist:
        return f"Blueprint {blueprint_id} not found."

    blueprint.status = BlueprintStatus.GENERATING
    blueprint.save()

    job_id = self.request.id
    job = None
    if job_id:
        try:
            job, _ = Job.objects.get_or_create(
                id=job_id,
                defaults={
                    "blueprint": blueprint,
                    "task_type": "INITIAL_DEBATE",
                    "status": "RUNNING"
                }
            )
            job.status = "RUNNING"
            job.save()
        except Exception:
            pass

    publish_event(blueprint_id, 'STATUS', {"message": "Debate has started"})

    try:
        final_state = GraphRunner.run_initial_debate(blueprint_id)

        if job:
            job.status = "SUCCESS"
            job.save()

        publish_event(blueprint_id, 'COMPLETE', {
            "message": "Debate completed successfully.",
            "blueprint_id": blueprint_id
        })

        return "SUCCESS"

    except Exception as e:
        error_msg = traceback.format_exc()

        blueprint.status = BlueprintStatus.FAILED
        blueprint.save()

        if job:
            job.status = "FAILURE"
            job.error_log = error_msg
            job.save()

        publish_event(blueprint_id, 'ERROR', {
            "message": "Debate encountered an error.",
            "error": str(e)
        })

        raise e


@shared_task(bind=True)
def run_section_regeneration(self, section_id: str, user_note: str, enforce_previous_decisions: bool = True):
    from django.db import transaction

    try:
        section = Section.objects.get(id=section_id)
        blueprint = section.blueprint
    except Section.DoesNotExist:
        return f"Section {section_id} not found."

    blueprint.status = BlueprintStatus.GENERATING
    blueprint.save()

    job_id = self.request.id
    job = None
    if job_id:
        try:
            job, _ = Job.objects.get_or_create(
                id=job_id,
                defaults={
                    "blueprint": blueprint,
                    "target_section": section,
                    "task_type": "REGENERATE",
                    "status": "RUNNING"
                }
            )
            job.status = "RUNNING"
            job.save()
        except Exception:
            pass

    publish_event(str(blueprint.id), 'STATUS', {"message": f"Regeneration started for section {section.category}."})

    try:
        # Retrieve active decisions for the blueprint
        active_decisions_db = list(DecisionLog.objects.filter(blueprint=blueprint, is_active=True))
        decisions_list = [{"key": dec.decision_key, "value": dec.choice_value} for dec in active_decisions_db]

        # Gather previous section contents as agent outputs
        agent_outputs = {}
        for sec in Section.objects.filter(blueprint=blueprint):
            active_version = Version.objects.filter(section=sec, is_active=True).first()
            if active_version:
                if sec.category == SectionCategory.BUSINESS:
                    agent_outputs['Investor'] = active_version.content_markdown
                elif sec.category == SectionCategory.PRODUCT:
                    agent_outputs['Product_Manager'] = active_version.content_markdown
                elif sec.category == SectionCategory.TECH_STACK:
                    agent_outputs['Tech_Lead'] = active_version.content_markdown

        # Set up starting state
        messages = [
            {"sender": "System", "content": f"Regeneration requested for section {section.category}."},
        ]
        if user_note:
            messages.append({"sender": "User", "content": f"User prompt: {user_note}"})

        initial_state = {
            "idea": blueprint.idea.raw_text,
            "messages": messages,
            "agent_outputs": agent_outputs,
            "debate_history": [],
            "constraints": [],
            "conflicts": [],
            "resolved_conflicts": [],
            "decisions": decisions_list,
            "pending_decisions": [],
            "current_agent": "",
            "confidence_scores": {},
            "iteration_count": 0,
            "blueprint_context": {
                "blueprint_id": str(blueprint.id),
                "title": blueprint.title
            }
        }

        # Override starting node to run only targeted agent subsequence
        nodes_to_run = AgentRouter.get_execution_nodes(section.category)
        node_mapping = {
            "Investor": investor_node,
            "Product_Manager": pm_node,
            "Tech_Lead": tech_lead_node,
            "Consistency_Check": consistency_check_node,
            "Tie_Breaker": tie_breaker_node,
        }

        state = initial_state
        for node_name in nodes_to_run:
            if job:
                job.current_node = node_name
                job.save()

            node_func = node_mapping[node_name]
            state_update = node_func(state)
            state.update(state_update)

        # Get generated content for this section category
        category_agent_map = {
            SectionCategory.BUSINESS: "Investor",
            SectionCategory.PRODUCT: "Product_Manager",
            SectionCategory.TECH_STACK: "Tech_Lead",
        }
        agent_name = category_agent_map.get(section.category, "Investor")
        new_content = state['agent_outputs'].get(agent_name, '')
        if not new_content and section.category == SectionCategory.MARKET:
            new_content = "Market validation and budget limits established:\n\n" + "\n".join(f"- {c}" for c in state.get('constraints', []))

        # Run extractor parser to check for proposed decisions
        proposed_decisions = DecisionExtractor.extract_decisions_from_text(new_content, agent_name)

        # Execute detect_conflicts
        conflicts = ConflictDetector.detect_conflicts(proposed_decisions, active_decisions_db)

        if conflicts:
            if enforce_previous_decisions:
                raise ConsistencyViolationError("Consistency violation: Proposed choices conflict with existing design decisions.")

        # Save result as new active Version within database transaction
        with transaction.atomic():
            Version.objects.filter(section=section).update(is_active=False)

            new_version = Version.objects.create(
                section=section,
                content_markdown=new_content,
                is_active=True,
                job=job
            )

            # Persist proposed decisions
            if conflicts:
                for conflict in conflicts:
                    active_conf = DecisionLog.objects.filter(
                        blueprint=blueprint,
                        decision_key=conflict['key'],
                        is_active=True
                    ).first()

                    if active_conf:
                        DecisionMemoryEngine.apply_override(
                            decision_id=str(active_conf.id),
                            choice_value=conflict['proposed_value'],
                            rationale=f"Overridden via section regeneration of {section.category}."
                        )

            # Save non-conflicting proposed decisions
            conflicting_keys = {c['key'] for c in conflicts}
            for dec in proposed_decisions:
                if dec['decision_key'] not in conflicting_keys:
                    DecisionLog.objects.create(
                        blueprint=blueprint,
                        created_by_version=new_version,
                        node_origin=agent_name,
                        decision_key=dec['decision_key'],
                        choice_value=dec['choice_value'],
                        rationale=dec.get('rationale', ''),
                        priority=dec.get('priority', 'P1'),
                        is_active=True
                    )

            blueprint.status = BlueprintStatus.READY
            blueprint.save()

            if job:
                job.status = "SUCCESS"
                job.save()

            publish_event(str(blueprint.id), 'COMPLETE', {
                "message": "Section regeneration completed successfully.",
                "blueprint_id": str(blueprint.id),
                "section_id": str(section.id)
            })

            return "SUCCESS"

    except Exception as e:
        error_msg = traceback.format_exc()

        blueprint.status = BlueprintStatus.FAILED
        blueprint.save()

        is_consistency_error = isinstance(e, ConsistencyViolationError)
        error_code = "DECISION_OVERRIDE_REQUIRED" if is_consistency_error else "FAILURE"

        if job:
            job.status = "FAILURE"
            job.error_log = error_code + "\n" + error_msg
            job.save()

        conflict_list = conflicts if 'conflicts' in locals() else []
        publish_event(str(blueprint.id), 'ERROR', {
            "message": str(e),
            "error_code": error_code,
            "conflicts": conflict_list
        })

        raise e


