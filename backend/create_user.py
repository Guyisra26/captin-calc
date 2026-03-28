#!/usr/bin/env python3
"""Usage: python create_user.py <username> <password> <display_name>"""
import sys
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from auth import hash_password

load_dotenv()

async def main():
    if len(sys.argv) != 4:
        print("Usage: python create_user.py <username> <password> <display_name>")
        sys.exit(1)
    username, password, display_name = sys.argv[1], sys.argv[2], sys.argv[3]
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("Error: MONGO_URL not set in .env")
        sys.exit(1)
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("MONGO_DB", "captincalc")]
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"User '{username}' already exists.")
        client.close()
        sys.exit(1)
    await db.users.insert_one({
        "username": username,
        "password_hash": hash_password(password),
        "display_name": display_name,
    })
    print(f"Created user '{username}' ({display_name})")
    client.close()

asyncio.run(main())
