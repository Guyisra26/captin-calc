import pytest
from fastapi import HTTPException

def test_get_admin_user_allows_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    import asyncio
    from auth import get_admin_user
    result = asyncio.run(get_admin_user("admin"))
    assert result == "admin"

def test_get_admin_user_blocks_non_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    import asyncio
    from auth import get_admin_user
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_admin_user("alice"))
    assert exc.value.status_code == 403

def test_get_admin_user_blocks_empty_env(monkeypatch):
    monkeypatch.delenv("ADMIN_USERNAME", raising=False)
    import asyncio
    from auth import get_admin_user
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_admin_user("admin"))
    assert exc.value.status_code == 403
