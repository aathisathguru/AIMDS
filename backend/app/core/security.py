"""Managed bearer sessions backed by Supabase."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Header, HTTPException

from app.core.config import settings
from app.core.supabase import get_client

_memory_sessions: dict[str, dict[str, Any]] = {}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user: dict[str, Any]) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.supabase_session_ttl_hours)
    client = get_client()
    if client is not None:
        client.table("aimds_sessions").insert({
            "token_hash": _hash(token),
            "user_id": user["id"],
            "expires_at": expires_at.isoformat(),
        }).execute()
    else:
        _memory_sessions[token] = {"user": dict(user), "expires_at": expires_at}
    return token


def get_session(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    client = get_client()
    if client is None:
        record = _memory_sessions.get(token)
        if not record or record["expires_at"] <= datetime.now(timezone.utc):
            _memory_sessions.pop(token, None)
            return None
        return record["user"]
    result = (
        client.table("aimds_sessions")
        .select("expires_at, user:aimds_users(*)")
        .eq("token_hash", _hash(token))
        .limit(1)
        .execute()
    )
    row = (result.data or [None])[0]
    if not row or datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) <= datetime.now(timezone.utc):
        if row:
            client.table("aimds_sessions").delete().eq("token_hash", _hash(token)).execute()
        return None
    return row.get("user")


def revoke_session(token: str | None) -> None:
    if not token:
        return
    client = get_client()
    if client is not None:
        client.table("aimds_sessions").delete().eq("token_hash", _hash(token)).execute()
    _memory_sessions.pop(token, None)


def require_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user = get_session(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
