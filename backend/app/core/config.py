"""Application settings loaded from environment variables."""
from __future__ import annotations

import os
from pathlib import Path

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.is_file():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=_env_path)
    except ImportError:
        for line in _env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _csv(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings:
    app_name: str = "AIMDS API"
    version: str = "1.0.0"
    description: str = (
        "Backend for AIMDS — AI-Based Multi-Utility Monitoring and Decision Support System. "
        "Serves the estate model, sensor readings, alert feed, AI insights and reports."
    )
    api_prefix: str = os.getenv("AIMDS_API_PREFIX", "/api")
    host: str = os.getenv("AIMDS_HOST", "0.0.0.0")
    port: int = int(os.getenv("AIMDS_PORT", "8000"))

    # Server-only Supabase credentials. Never expose the service-role key to Vite.
    _raw_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supabase_url: str = (
        _raw_url
        if not _raw_url or _raw_url.startswith("http://") or _raw_url.startswith("https://")
        else f"https://{_raw_url}.supabase.co"
    )
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    supabase_session_ttl_hours: int = int(os.getenv("AIMDS_SESSION_TTL_HOURS", "24"))
    telemetry_ingest_token: str = os.getenv("AIMDS_TELEMETRY_INGEST_TOKEN", "").strip()
    telemetry_history_limit: int = int(os.getenv("AIMDS_TELEMETRY_HISTORY_LIMIT", "500"))
    # Server-only SMS gateway credentials. Never expose these to Vite/browser code.
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    twilio_from_number: str = os.getenv("AIMDS_TWILIO_FROM_NUMBER", "").strip()
    sms_cooldown_seconds: int = int(os.getenv("AIMDS_SMS_COOLDOWN_SECONDS", "900"))

    cors_origins: list[str] = _csv(
        "AIMDS_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
    )
    cors_origin_regex: str = os.getenv("AIMDS_CORS_ORIGIN_REGEX", r"https://.*\.manus\.computer")
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()


settings = Settings()
