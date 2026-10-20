"""Supabase client lifecycle for AIMDS.

Only the FastAPI server uses the service-role key. The browser never receives
this key; it continues to call the protected API routes.
"""
from __future__ import annotations

from typing import Any

from app.core.config import settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - dependency installation guard
    Client = Any  # type: ignore[misc,assignment]
    create_client = None  # type: ignore[assignment]


class SupabaseConnection:
    def __init__(self) -> None:
        self.client: Client | None = None
        self.connected = False

    @property
    def configured(self) -> bool:
        return bool(settings.supabase_url and settings.supabase_service_role_key)

    def connect(self) -> Client | None:
        if not self.configured:
            return None
        if create_client is None:
            raise RuntimeError("The supabase package is not installed")
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        # A lightweight query verifies URL, key, network and schema access.
        self.client.table("aimds_users").select("id").limit(1).execute()
        self.connected = True
        return self.client

    def close(self) -> None:
        # supabase-py uses pooled HTTP clients internally; there is no explicit
        # close operation. Dropping the reference makes lifecycle ownership clear.
        self.client = None
        self.connected = False


supabase = SupabaseConnection()


def get_client() -> Client | None:
    return supabase.client
