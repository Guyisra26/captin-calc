import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_client: AsyncIOMotorClient | None = None

def get_db():
    return _client[os.getenv("MONGO_DB", "captincalc")]

async def connect_db():
    global _client
    _client = AsyncIOMotorClient(os.getenv("MONGO_URL"))

async def close_db():
    global _client
    if _client:
        _client.close()
