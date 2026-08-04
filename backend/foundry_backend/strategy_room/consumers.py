from channels.generic.websocket import AsyncJsonWebsocketConsumer

class StrategyRoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass
