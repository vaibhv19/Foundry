from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from blueprints.models import Blueprint

@database_sync_to_async
def check_blueprint_ownership(blueprint_id, user):
    if not user or user.is_anonymous:
        return False
    try:
        blueprint = Blueprint.objects.get(id=blueprint_id)
        return blueprint.user == user
    except (Blueprint.DoesNotExist, ValueError):
        return False

@database_sync_to_async
def get_blueprint_state(blueprint_id):
    try:
        blueprint = Blueprint.objects.get(id=blueprint_id)
        return {
            "blueprint_id": str(blueprint.id),
            "status": blueprint.status,
            "title": blueprint.title
        }
    except (Blueprint.DoesNotExist, ValueError):
        return {"error": "Blueprint not found"}

class StrategyRoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.blueprint_id = self.scope['url_route']['kwargs']['blueprint_id']
        self.user = self.scope.get('user', None)

        is_owner = await check_blueprint_ownership(self.blueprint_id, self.user)
        if not is_owner:
            await self.close(code=4003)
            return

        self.group_name = f"strategy_{self.blueprint_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        command = content.get('command')

        if command == 'resume_generation':
            # Trigger Celery task (this will be wired in tasks/views later)
            await self.send_json({
                "type": "STATUS",
                "payload": {"message": "Resuming generation... task queued."}
            })
        elif command == 'cancel_generation':
            await self.send_json({
                "type": "STATUS",
                "payload": {"message": "Cancellation requested."}
            })
        elif command == 'request_state':
            state_data = await get_blueprint_state(self.blueprint_id)
            await self.send_json({
                "type": "STATUS",
                "payload": state_data
            })
        else:
            await self.send_json({
                "type": "ERROR",
                "payload": {"message": f"Unknown command: {command}"}
            })

    async def broadcast_event(self, event):
        await self.send_json({
            "type": event.get("event_type"),
            "payload": event.get("payload")
        })
