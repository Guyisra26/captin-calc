import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_client: AsyncIOMotorClient | None = None

def get_db():
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _client[os.getenv("MONGO_DB", "captincalc")]

async def connect_db():
    global _client
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL environment variable is not set")
    _client = AsyncIOMotorClient(mongo_url)

async def close_db():
    global _client
    if _client:
        _client.close()
