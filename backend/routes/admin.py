from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db import get_db
from auth import get_admin_user, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    username: str
    display_name: str
    password: str


@router.get("/users")
async def list_users(_: str = Depends(get_admin_user)):
    db = get_db()
    users = await db.users.find({}, {"password_hash": 0}).to_list(None)
    return [
        {"id": str(u["_id"]), "username": u["username"], "display_name": u["display_name"]}
        for u in users
    ]


@router.post("/users", status_code=201)
async def create_user(body: CreateUserRequest, _: str = Depends(get_admin_user)):
    db = get_db()
    existing = await db.users.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    await db.users.insert_one({
        "username": body.username,
        "display_name": body.display_name,
        "password_hash": hash_password(body.password),
    })
    return {"ok": True}
