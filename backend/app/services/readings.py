"""Compatibility adapters for timestamped readings received from Velxio."""
from __future__ import annotations
from typing import Any
from app.services.telemetry import telemetry

def get_series(seed: str = "default", range_id: str = "24h", base: float | None = None, **_: Any) -> list[dict[str, Any]]:
    """Return only values present in the validated telemetry history."""
    metric = 'temperature' if 'temp' in seed.lower() else 'humidity' if 'humid' in seed.lower() else 'voltage' if 'volt' in seed.lower() else 'current' if 'curr' in seed.lower() else 'energy' if 'energy' in seed.lower() else 'power'
    return [
        {"label": row.get("received_at") or row.get("timestamp"), "value": row[metric], "timestamp": row.get("received_at") or row.get("timestamp"), "expected": None, "band": None, "low": None, "high": None}
        for row in telemetry.history(limit=500) if row.get(metric) is not None
    ]

def get_comparison_series(*_: Any, **__: Any) -> list[dict[str, Any]]:
    return []

def get_utility_mix(*_: Any, **__: Any) -> list[dict[str, Any]]:
    latest = telemetry.latest()
    if not latest:
        return []
    row = {"label": latest.get("device_id")}
    for key in ("energy", "water", "power"):
        if latest.get(key) is not None:
            row[key] = latest[key]
    return [row] if len(row) > 1 else []
