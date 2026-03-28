import pytest
from auth import hash_password, verify_password, create_token, decode_token

def test_password_round_trip():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)

def test_token_round_trip():
    token = create_token("user_abc")
    assert decode_token(token) == "user_abc"

def test_invalid_token_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        decode_token("not-a-token")
    assert exc_info.value.status_code == 401
