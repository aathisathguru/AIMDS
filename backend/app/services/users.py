"""AIMDS user service backed by Supabase."""
from __future__ import annotations

import base64
import copy
import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Any

from app.core.supabase import get_client

DEFAULT_USERS = [
    {"id": "USR-001", "email": "aathi@gmail.com", "name": "Aathi", "initials": "AA", "role": "System Administrator", "picture": None, "auth_provider": "local", "google_id": None, "created_at": "2024-01-01T00:00:00Z", "last_login": None},
    {"id": "USR-002", "email": "ops@aimds.io", "name": "Operations Lead", "initials": "OL", "role": "Operations Lead", "picture": None, "auth_provider": "local", "google_id": None, "created_at": "2024-01-01T00:00:00Z", "last_login": None},
]


def derive_initials(name: str, email: str = "") -> str:
    parts = [p for p in name.replace("_", " ").replace("-", " ").replace(".", " ").split() if p]
    if len(parts) >= 2: return (parts[0][0] + parts[1][0]).upper()
    if len(parts) == 1 and len(parts[0]) >= 2: return parts[0][:2].upper()
    return email.split("@")[0][:2].upper() if email else "US"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210_000)
    return f"pbkdf2_sha256$210000${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded or not encoded.startswith("pbkdf2_sha256$"): return False
    try:
        _, rounds, salt_b64, digest_b64 = encoded.split("$", 3)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(rounds))
        return hmac.compare_digest(actual, base64.b64decode(digest_b64))
    except (ValueError, TypeError): return False


class UserService:
    def __init__(self) -> None:
        self._users = copy.deepcopy(DEFAULT_USERS)
        admin_email = os.getenv("AIMDS_ADMIN_EMAIL", "").strip().lower()
        admin_pass = os.getenv("AIMDS_ADMIN_PASSWORD", "")
        if admin_email and admin_pass:
            existing = next((u for u in self._users if u["email"].lower() == admin_email), None)
            if existing:
                existing["password_hash"] = hash_password(admin_pass)
            else:
                self._users.append({
                    "id": f"USR-{len(self._users)+1:03d}",
                    "email": admin_email,
                    "name": "Administrator",
                    "initials": derive_initials("Administrator", admin_email),
                    "role": "System Administrator",
                    "picture": None,
                    "google_id": None,
                    "auth_provider": "local",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_login": None,
                    "password_hash": hash_password(admin_pass),
                })

    @staticmethod
    def _row(user: dict[str, Any]) -> dict[str, Any]:
        row = copy.deepcopy(user)
        row["email"] = row["email"].lower()
        return row

    def initialize_persistence(self) -> None:
        client = get_client()
        if client is None: return
        client.table("aimds_users").upsert([self._row(user) for user in DEFAULT_USERS], on_conflict="email").execute()
        rows = client.table("aimds_users").select("*").limit(5000).execute().data or []
        if rows: self._users = rows

    def get_by_email(self, email: str) -> dict[str, Any] | None:
        normalized = email.strip().lower()
        client = get_client()
        if client is not None:
            rows = client.table("aimds_users").select("*").eq("email", normalized).limit(1).execute().data or []
            return rows[0] if rows else None
        return next((u for u in self._users if u.get("email", "").lower() == normalized), None)

    def get_by_google_id(self, google_id: str) -> dict[str, Any] | None:
        client = get_client()
        if client is not None:
            rows = client.table("aimds_users").select("*").eq("google_id", google_id).limit(1).execute().data or []
            return rows[0] if rows else None
        return next((u for u in self._users if u.get("google_id") == google_id), None)

    @staticmethod
    def public_user(user: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in user.items() if k not in {"password_hash", "token_hash"}}

    def authenticate_local(self, email: str, password: str) -> dict[str, Any] | None:
        normalized = email.strip().lower()
        user = self.get_by_email(normalized)
        if not user:
            return None
        if user.get("password_hash"):
            return user if verify_password(password, user.get("password_hash")) else None
        admin_pass = os.getenv("AIMDS_ADMIN_PASSWORD")
        admin_email = os.getenv("AIMDS_ADMIN_EMAIL", "").strip().lower()
        if admin_pass and admin_email and normalized == admin_email:
            return user if hmac.compare_digest(password, admin_pass) else None
        return None

    def _save(self, user: dict[str, Any]) -> dict[str, Any]:
        normalized = self._row(user)
        client = get_client()
        if client is not None:
            try:
                existing_row = client.table("aimds_users").select("id").eq("email", normalized["email"]).limit(1).execute().data
                if existing_row:
                    normalized["id"] = existing_row[0]["id"]
            except Exception:
                pass
            result = client.table("aimds_users").upsert(normalized, on_conflict="email").execute()
            if result.data: normalized = result.data[0]
        for idx, existing in enumerate(self._users):
            if existing.get("email", "").lower() == normalized["email"]: self._users[idx] = copy.deepcopy(normalized); break
        else: self._users.append(copy.deepcopy(normalized))
        return normalized

    def upsert_google_user(self, email: str, name: str | None = None, picture: str | None = None, google_id: str | None = None) -> dict[str, Any]:
        normalized = email.strip().lower(); existing = self.get_by_email(normalized); now = datetime.now(timezone.utc).isoformat()
        display = name or (existing.get("name") if existing else normalized.split("@")[0].capitalize())
        user = {"id": existing.get("id", f"USR-{len(self._users)+1:03d}") if existing else f"USR-{len(self._users)+1:03d}", "email": normalized, "name": display, "initials": derive_initials(display, normalized), "role": "System Administrator" if normalized in ("aathi@gmail.com", "ops@aimds.io") or (existing and existing.get("role") == "System Administrator") else (existing.get("role") if existing else "Operations Engineer"), "picture": picture or (existing.get("picture") if existing else None), "google_id": google_id or (existing.get("google_id") if existing else None), "auth_provider": "google", "created_at": existing.get("created_at", now) if existing else now, "last_login": now}
        return self._save(user)

    def upsert_local_user(self, email: str, name: str | None = None) -> dict[str, Any]:
        normalized = email.strip().lower(); existing = self.get_by_email(normalized); now = datetime.now(timezone.utc).isoformat(); display = name or (existing.get("name") if existing else normalized.split("@")[0].capitalize())
        user = {"id": existing.get("id", f"USR-{len(self._users)+1:03d}") if existing else f"USR-{len(self._users)+1:03d}", "email": normalized, "name": display, "initials": derive_initials(display, normalized), "role": "System Administrator" if normalized in ("aathi@gmail.com", "ops@aimds.io") or (existing and existing.get("role") == "System Administrator") else (existing.get("role") if existing else "Operations Lead"), "picture": existing.get("picture") if existing else None, "google_id": existing.get("google_id") if existing else None, "auth_provider": existing.get("auth_provider", "local") if existing else "local", "last_login": now, "password_hash": existing.get("password_hash") if existing else None, "created_at": existing.get("created_at", now) if existing else now}
        return self._save(user)

    def create_user(self, email: str, name: str, role: str = "Operations Engineer", password: str | None = None) -> dict[str, Any]:
        normalized = email.strip().lower()
        existing = self.get_by_email(normalized)
        now = datetime.now(timezone.utc).isoformat()
        user_id = existing.get("id") if existing else f"USR-{len(self._users)+1:03d}"
        user = {
            "id": user_id,
            "email": normalized,
            "name": name.strip(),
            "initials": derive_initials(name, normalized),
            "role": role,
            "picture": existing.get("picture") if existing else None,
            "google_id": existing.get("google_id") if existing else None,
            "auth_provider": "local",
            "created_at": existing.get("created_at", now) if existing else now,
            "last_login": now,
            "password_hash": hash_password(password) if password else None,
        }
        return self.public_user(self._save(user))

    def list_users(self) -> list[dict[str, Any]]:
        client = get_client()
        rows = client.table("aimds_users").select("*").limit(5000).execute().data if client is not None else self._users
        return [self.public_user(row) for row in (rows or [])]


users = UserService()
