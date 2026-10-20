"""Real-time and historical sensor telemetry readings — strictly driven by actual Velxio simulator data."""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query

from app.core.security import require_user
from app.services.telemetry import telemetry

router = APIRouter(prefix="/readings", tags=["readings"], dependencies=[Depends(require_user)])


def _detect_metric_key(sensor: str) -> str:
    s = sensor.lower()
    if "temp" in s:
        return "temperature"
    if "humid" in s:
        return "humidity"
    if "volt" in s:
        return "voltage"
    if "curr" in s:
        return "current"
    if "energy" in s:
        return "energy"
    if "water" in s:
        return "water"
    return "power"


@router.get("", summary="Series for one sensor from actual incoming Velxio telemetry")
def list_readings(
    sensor: str = Query(default="default", description="Sensor id, metric or location"),
    range: str = Query(default="24h", pattern="^(24h|7d|6w|6m)$"),
    base: float | None = Query(default=None, description="Optional baseline"),
) -> list[dict]:
    metric = _detect_metric_key(sensor)
    history_records = telemetry.history(limit=120)
    if not history_records:
        return []

    points = []
    for idx, r in enumerate(history_records):
        val = r.get(metric)
        if val is None and metric == "energy":
            val = r.get("power")
        if val is not None and isinstance(val, (int, float)):
            rec_str = r.get("received_at") or r.get("timestamp")
            time_label = ""
            if rec_str:
                try:
                    dt = datetime.fromisoformat(rec_str.replace("Z", "+00:00"))
                    time_label = dt.strftime("%H:%M:%S")
                except Exception:
                    time_label = f"Pt {idx + 1}"
            else:
                time_label = f"Pt {idx + 1}"

            points.append({
                "label": time_label,
                "value": round(float(val), 2),
                "timestamp": rec_str,
                "expected": None,
                "band": None,
                "low": None,
                "high": None,
            })
    return points


@router.get("/comparison", summary="Real location comparisons based on live active devices")
def comparison(
    range: str = Query(default="7d", pattern="^(24h|7d|6w|6m)$"),
    block: str | None = Query(default=None, description="Optional block code filter"),
) -> list[dict]:
    history_records = telemetry.history(limit=30)
    if not history_records:
        return []

    rows = []
    for idx, r in enumerate(history_records[-15:]):
        rec_str = r.get("received_at") or r.get("timestamp")
        try:
            time_label = datetime.fromisoformat(rec_str.replace("Z", "+00:00")).strftime("%H:%M")
        except Exception:
            time_label = f"T-{idx}"

        dev = r.get("device_id", "ESP32-AIMDS-01")
        val = r.get("power") or r.get("temperature") or 0.0
        rows.append({
            "label": time_label,
            dev: round(float(val), 1),
        })
    return rows


@router.get("/mix", summary="Utility breakdown from actual measured channels")
def mix(block: str | None = Query(default=None, description="Optional block code filter")) -> list[dict]:
    latest = telemetry.latest()
    if not latest:
        return []

    breakdown = []
    if latest.get("power") is not None:
        breakdown.append({"label": "Active Electrical Power", "value": latest["power"], "unit": "W", "color": "var(--accent)"})
    if latest.get("voltage") is not None:
        breakdown.append({"label": "Grid Voltage Potential", "value": latest["voltage"], "unit": "V", "color": "var(--blue)"})
    if latest.get("temperature") is not None:
        breakdown.append({"label": "Thermal Dissipation", "value": latest["temperature"], "unit": "°C", "color": "var(--warn)"})
    return breakdown
