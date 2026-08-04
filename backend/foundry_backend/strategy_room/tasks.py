import traceback
from celery import shared_task
from blueprints.models import Blueprint, BlueprintStatus, Job
from .runner import GraphRunner
from .publisher import publish_event

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
