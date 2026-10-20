"""Deterministic alert rules shared by the alert feed and notification dispatcher."""
from __future__ import annotations

from typing import Any


def alerts_for_reading(reading: dict[str, Any]) -> list[dict[str, Any]]:
    """Return active threshold alerts for one normalized telemetry reading."""
    block_code = reading.get("block_code") or reading.get("blockCode") or "SF"
    floor_code = reading.get("floor_code") or reading.get("floorCode") or "1F"
    location = {
        "blockCode": block_code,
        "floorCode": floor_code,
        "blockName": "Sunflower" if block_code == "SF" else block_code,
        "floorName": "Floor 1" if floor_code == "1F" else floor_code,
    }
    alerts: list[dict[str, Any]] = []

    voltage = reading.get("voltage")
    if voltage is not None:
        if voltage < 190.0:
            alerts.append({
                "id": "ALT-VOLT-LOW",
                "title": f"Mains Undervoltage: {voltage}V (Nominal 230V)",
                "severity": "warning",
                "status": "Active",
                "value": voltage,
                "unit": "V",
                "metric": "voltage",
                **location,
            })
        elif voltage > 250.0:
            alerts.append({
                "id": "ALT-VOLT-HIGH",
                "title": f"Mains Overvoltage Spike: {voltage}V",
                "severity": "critical",
                "status": "Active",
                "value": voltage,
                "unit": "V",
                "metric": "voltage",
                **location,
            })

    temperature = reading.get("temperature")
    if temperature is not None and temperature > 35.0:
        alerts.append({
            "id": "ALT-TEMP-HIGH",
            "title": f"High Ambient Temperature: {temperature}°C",
            "severity": "critical" if temperature > 45.0 else "warning",
            "status": "Active",
            "value": temperature,
            "unit": "°C",
            "metric": "temperature",
            **location,
        })

    power = reading.get("power")
    if power is not None and power > 2500.0:
        alerts.append({
            "id": "ALT-PWR-HIGH",
            "title": f"High Power Load: {power}W",
            "severity": "warning",
            "status": "Active",
            "value": power,
            "unit": "W",
            "metric": "power",
            **location,
        })

    return alerts
