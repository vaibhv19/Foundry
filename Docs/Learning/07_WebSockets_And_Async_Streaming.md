# WebSockets And Async Streaming

This document details the configuration and architecture implemented for real-time WebSocket communication, token authorization, and async Celery background tasks in Phase 07.

## 1. Protocol Architecture

The real-time streaming pipeline integrates Django Channels (ASGI) alongside Celery workers, communicating over a Redis backbone.

```text
                  +-------------------+
                  |   Client Browser  |
                  +---------┬---------+
                            │ WebSocket Connection
                            ▼
                  +-------------------+
                  |   Daphne Server   |
                  +---------┬---------+
                            │
                            ▼ (ASGI Protocol Type Router)
                  +-------------------+
                  | JWTAuthMiddleware |
                  +---------┬---------+
                            │ (Validates simplejwt query token)
                            ▼
                  +--------------------+
                  |StrategyRoomConsumer|
                  +---------┬----------+
                            │ (Subscribes to redis group)
                            ▼
                     [Redis Channel Layer]
                            ▲
                            │ (Broadcasting events via async_to_sync)
                  +---------┴----------+
                  |  Celery Task Worker|
                  +--------------------+
```

---

## 2. JWT Query String Authentication

Standard REST cookies and authorization headers are not universally supported during initial WebSocket handshakes. We intercept the query string `?token=<jwt_token>` and parse it:

```python
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])
        # Decodes user_id via AccessToken and assigns custom user object
```

Connections containing missing, invalid, or expired tokens are immediately closed.

---

## 3. Celery Worker Configurations

Celery daemon uses Redis as the task broker and backend. It operates off the Django request lifecycle to run the `GraphRunner` debate synchronously in the background:

-   **Broker URL**: `redis://redis:6379/0` (shared cache and channel layer)
-   **Result Backend**: `redis://redis:6379/1` (isolated result storage)
-   **Command**: `celery -A foundry_backend worker`

---

## 4. WebSocket Event Payloads

Refer to `Docs/WebSocket_Protocol.md` for JSON envelopes. The publisher sends:

### `NODE_STARTED`
```json
{
  "type": "NODE_STARTED",
  "payload": {
    "node": "Investor"
  }
}
```

### `TOKEN`
```json
{
  "type": "TOKEN",
  "payload": {
    "node": "Investor",
    "token": "Drafting "
  }
}
```

### `STATUS`
```json
{
  "type": "STATUS",
  "payload": {
    "message": "Debate has started"
  }
}
```

---

## 5. Engineering Lessons & Troubleshooting Stories

### 5.1 Daphne ASGI Protocol Routing Conflicts
* **Problem**: When starting the backend server with Daphne, HTTP requests loaded successfully, but WebSocket connection handshakes failed instantly with `500 Internal Server Error` or rejected HTTP upgrade headers.
* **Why it happened**: The project was initially configured to run through the standard WSGI handler. WSGI does not support the stateful TCP connection upgrade sequences required by WebSockets.
* **Solution**: We configured `foundry_backend/asgi.py` to route traffic based on protocols. We wrap the application in a `ProtocolTypeRouter` that separates `http` and `websocket` paths:
  ```python
  application = ProtocolTypeRouter({
      "http": get_asgi_application(),
      "websocket": AllowedHostsOriginValidator(
          JWTAuthMiddleware(
              URLRouter(websocket_urlpatterns)
          )
      ),
  })
  ```
  Daphne coordinates ASGI pipelines, allowing both HTTP endpoints and TCP WebSockets to run on the same network port `8000`.

### 5.2 Thread-Safe Sync-to-Async Channels Publishing
* **Problem**: When the Celery worker task (`run_strategy_debate`) invoked `channel_layer.group_send()` to stream tokens, the execution failed with synchronous task errors: `SynchronousOnlyOperation: You cannot call this from a sync thread.`
* **Why it happened**: The Celery worker runs in a synchronous Python environment. However, Django Channels' channel layers are async-native, meaning their operations must be awaited inside an active event loop.
* **Solution**: We wrapped all WebSocket dispatches inside `asgiref.sync.async_to_sync`:
  ```python
  from asgiref.sync import async_to_sync
  from channels.layers import get_channel_layer

  def publish_event(group, event_type, payload):
      layer = get_channel_layer()
      async_to_sync(layer.group_send)(
          f"blueprint_{group}",
          {"type": "broadcast_event", "data": {"type": event_type, "payload": payload}}
      )
  ```
  This handles context switching safely, preventing worker threads from blocking or throwing exceptions.

