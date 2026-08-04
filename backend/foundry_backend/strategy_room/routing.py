from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/strategy/(?P<blueprint_id>[a-fA-F0-9\-]+)/$', consumers.StrategyRoomConsumer.as_asgi()),
]
