"""SMS notification settings, Twilio delivery and auditable delivery history."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import requests

from app.core.config import settings
from app.core.supabase import get_client

E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
DEFAULT_SETTINGS: dict[str, Any] = {
    "mobile_number": None,
    "sms_enabled": False,
    "sms_critical": True,
    "sms_warning": True,
    "sms_info": False,
    "cooldown_seconds": settings.sms_cooldown_seconds,
}

_memory_settings: dict[str, dict[str, Any]] = {}
_memory_history: list[dict[str, Any]] = []


def validate_mobile_number(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    normalized = value.strip()
    if not E164_RE.fullmatch(normalized):
        raise ValueError("Mobile number must use international E.164 format, for example +14155552671.")
    return normalized


def _public_settings(user_id: str, row: dict[str, Any] | None = None) -> dict[str, Any]:
    merged = {**DEFAULT_SETTINGS, **(row or {})}
    merged["user_id"] = user_id
    return {
        "user_id": user_id,
        "mobile_number": merged.get("mobile_number"),
        "sms_enabled": bool(merged.get("sms_enabled")),
        "sms_critical": bool(merged.get("sms_critical")),
        "sms_warning": bool(merged.get("sms_warning")),
        "sms_info": bool(merged.get("sms_info")),
        "cooldown_seconds": int(merged.get("cooldown_seconds") or 900),
        "updated_at": merged.get("updated_at"),
    }


def get_settings(user_id: str) -> dict[str, Any]:
    client = get_client()
    if client is not None:
        try:
            rows = (
                client.table("aimds_notification_settings")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            if rows:
                return _public_settings(user_id, rows[0])
        except Exception:
            pass
    return _public_settings(user_id, _memory_settings.get(user_id))


def update_settings(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    current = get_settings(user_id)
    mobile_number = validate_mobile_number(payload.get("mobile_number", current.get("mobile_number")))
    cooldown_seconds = int(payload.get("cooldown_seconds", current.get("cooldown_seconds", 900)))
    if cooldown_seconds < 60 or cooldown_seconds > 86_400:
        raise ValueError("Cooldown must be between 60 seconds and 24 hours.")

    values = {
        "user_id": user_id,
        "mobile_number": mobile_number,
        "sms_enabled": bool(payload.get("sms_enabled", current["sms_enabled"])),
        "sms_critical": bool(payload.get("sms_critical", current["sms_critical"])),
        "sms_warning": bool(payload.get("sms_warning", current["sms_warning"])),
        "sms_info": bool(payload.get("sms_info", current["sms_info"])),
        "cooldown_seconds": cooldown_seconds,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _memory_settings[user_id] = values

    client = get_client()
    if client is not None:
        client.table("aimds_notification_settings").upsert(values, on_conflict="user_id").execute()
    return _public_settings(user_id, values)


def _settings_for_dispatch() -> list[dict[str, Any]]:
    client = get_client()
    if client is not None:
        try:
            rows = client.table("aimds_notification_settings").select("*").eq("sms_enabled", True).execute().data or []
            return [_public_settings(row["user_id"], row) for row in rows if row.get("mobile_number")]
        except Exception:
            pass
    return [_public_settings(uid, row) for uid, row in _memory_settings.items() if row.get("sms_enabled") and row.get("mobile_number")]


def list_history(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    limit = min(max(int(limit), 1), 200)
    client = get_client()
    if client is not None:
        try:
            rows = (
                client.table("aimds_sms_deliveries")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
                .data
                or []
            )
            return rows
        except Exception:
            pass
    return list(reversed([row for row in _memory_history if row["user_id"] == user_id][-limit:]))


def _is_duplicate(user_id: str, trigger_key: str, cooldown_seconds: int) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=cooldown_seconds)
    client = get_client()
    if client is not None:
        try:
            rows = (
                client.table("aimds_sms_deliveries")
                .select("created_at,status")
                .eq("user_id", user_id)
                .eq("trigger_key", trigger_key)
                .gte("created_at", cutoff.isoformat())
                .in_("status", ["sent", "submitted"])
                .limit(1)
                .execute()
                .data
                or []
            )
            return bool(rows)
        except Exception:
            pass
    for row in reversed(_memory_history):
        if row["user_id"] == user_id and row["trigger_key"] == trigger_key and row["status"] in {"sent", "submitted"}:
            try:
                created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                return created >= cutoff
            except ValueError:
                continue
    return False


def _record(row: dict[str, Any]) -> dict[str, Any]:
    _memory_history.append(row)
    client = get_client()
    if client is not None:
        try:
            client.table("aimds_sms_deliveries").insert(row).execute()
        except Exception:
            pass
    return row


def _twilio_send(to_number: str, body: str) -> tuple[str, str | None, str | None]:
    """Return (status, provider_message_id, error_message); never fabricates success."""
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
        return "not_configured", None, "Twilio credentials or AIMDS_TWILIO_FROM_NUMBER are missing."
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        response = requests.post(
            url,
            data={"From": settings.twilio_from_number, "To": to_number, "Body": body},
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=10,
        )
        data = response.json() if response.content else {}
        if 200 <= response.status_code < 300 and data.get("sid"):
            return "submitted", data["sid"], None
        return "failed", None, str(data.get("message") or f"Twilio returned HTTP {response.status_code}")
    except requests.RequestException as exc:
        return "failed", None, str(exc)


def dispatch_alert(alert: dict[str, Any], sender: Callable[[str, str], tuple[str, str | None, str | None]] | None = None) -> list[dict[str, Any]]:
    """Attempt delivery for every configured recipient and record every decision.

    The default sender performs a real Twilio request. Tests can inject a sender;
    production code does not treat missing credentials as a successful delivery.
    """
    severity = str(alert.get("severity", "info")).lower()
    setting_key = f"sms_{severity}"
    sender = sender or _twilio_send
    results: list[dict[str, Any]] = []
    trigger_key = ":".join(
        str(alert.get(key) or "") for key in ("id", "severity", "blockCode", "floorCode")
    )
    occurred_at = datetime.now(timezone.utc).isoformat()
    value = alert.get("value")

    for recipient in _settings_for_dispatch():
        user_id = recipient["user_id"]
        if not recipient.get(setting_key) or _is_duplicate(user_id, trigger_key, recipient["cooldown_seconds"]):
            continue
        body = (
            f"AIMDS {severity.upper()} alert: {alert.get('title', alert.get('id'))}. "
            f"Detected value: {value if value is not None else '—'} {alert.get('unit', '')}. "
            f"Time: {occurred_at}."
        )
        status, provider_id, error_message = sender(recipient["mobile_number"], body)
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "alert_id": alert.get("id"),
            "trigger_key": trigger_key,
            "alert_type": alert.get("metric") or alert.get("id"),
            "severity": severity,
            "detected_value": str(value) if value is not None else None,
            "unit": alert.get("unit"),
            "occurred_at": occurred_at,
            "to_number": recipient["mobile_number"],
            "status": status,
            "provider_message_id": provider_id,
            "error_message": error_message,
            "created_at": occurred_at,
        }
        results.append(_record(row))
    return results
