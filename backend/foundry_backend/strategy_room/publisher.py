from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def publish_event(blueprint_id: str, event_type: str, payload: dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    group_name = f"strategy_{blueprint_id}"

    # Standardize the event packet matching the WebSocket Protocol
    message = {
        "type": "broadcast_event",
        "event_type": event_type,
        "payload": payload
    }

    async_to_sync(channel_layer.group_send)(group_name, message)
