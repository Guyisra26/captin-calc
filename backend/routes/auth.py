from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from db import get_db
from auth import verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(body: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(user["username"])
    return {"token": token, "display_name": user["display_name"]}
