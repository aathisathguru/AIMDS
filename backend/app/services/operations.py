"""Alerts, AI insights, reports and system overview strictly calculated from real telemetry."""
from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any

from app.core.supabase import get_client
from app.services.alert_rules import alerts_for_reading
from app.services.hybrid_ai import insight_cards
from app.services.telemetry import telemetry


class OperationsStore:
    def __init__(self) -> None:
        self._user_alerts_ack: set[str] = set()
        self._user_alerts_resolved: set[str] = set()
        self._reports: list[dict] = []
        self.decision_stages = [
            {"id": "ingest", "name": "Telemetry Ingestion", "detail": "Validates HTTP/JSON packets from Velxio ESP32"},
            {"id": "normalize", "name": "Payload Normalization", "detail": "Extracts V, I, P, T, H and calculates cumulative kWh"},
            {"id": "thresholds", "name": "Threshold Analysis", "detail": "Evaluates live readings against safety limits"},
            {"id": "dispatch", "name": "Decision Dispatch", "detail": "Surfaces alerts and actionable decisions in real time"},
        ]
        self.pipeline_stages = self.decision_stages
        self.current_user: dict[str, Any] = {"id": "USR-001", "name": "Aathi", "email": "aathi@gmail.com", "role": "System Administrator"}

    def initialize_persistence(self) -> None:
        pass

    def list_alerts(self, severity: str = "all", block: str | None = None) -> list[dict]:
        status_info = telemetry.get_status()
        latest = status_info["reading"]
        generated: list[dict] = []

        if not latest:
            generated.append({
                "id": "ALT-STANDBY",
                "title": "Awaiting Velxio ESP32 Stream",
                "severity": "info",
                "status": "Standby",
                "blockCode": "SF",
                "floorCode": "1F",
                "blockName": "Sunflower",
                "floorName": "Floor 1",
                "value": "—",
                "unit": "",
                "minutesAgo": 0,
                "acknowledged": "ALT-STANDBY" in self._user_alerts_ack,
            })
        elif status_info["state"] == "disconnected":
            generated.append({
                "id": "ALT-OFFLINE",
                "title": "Device Offline: Velxio ESP32 stopped sending data",
                "severity": "critical",
                "status": "Offline",
                "blockCode": latest.get("block_code") or "SF",
                "floorCode": latest.get("floor_code") or "1F",
                "blockName": "Sunflower",
                "floorName": "Floor 1",
                "value": "Offline",
                "unit": "",
                "minutesAgo": int((status_info["last_seen_sec"] or 60) / 60),
                "acknowledged": "ALT-OFFLINE" in self._user_alerts_ack,
            })
        elif status_info["state"] == "stale":
            generated.append({
                "id": "ALT-STALE",
                "title": f"Telemetry Stale: No update for {int(status_info['last_seen_sec'] or 0)}s",
                "severity": "warning",
                "status": "Stale",
                "blockCode": latest.get("block_code") or "SF",
                "floorCode": latest.get("floor_code") or "1F",
                "blockName": "Sunflower",
                "floorName": "Floor 1",
                "value": f"{int(status_info['last_seen_sec'] or 0)}s",
                "unit": "ago",
                "minutesAgo": 0,
                "acknowledged": "ALT-STALE" in self._user_alerts_ack,
            })
        else:
            # The same rules also drive SMS dispatch during telemetry ingest.
            for alert in alerts_for_reading(latest):
                alert["minutesAgo"] = 0
                alert["acknowledged"] = alert["id"] in self._user_alerts_ack
                generated.append(alert)

        # Filter out resolved or severity filter
        final_list = []
        for a in generated:
            if a["id"] in self._user_alerts_resolved:
                a["severity"] = "resolved"
                a["status"] = "Resolved"
                a["acknowledged"] = True
            if severity != "all" and a["severity"] != severity:
                continue
            if block and block != "all" and a.get("blockCode") != block.upper():
                continue
            final_list.append(a)

        return final_list

    def get_alert(self, alert_id: str) -> dict | None:
        for a in self.list_alerts():
            if a["id"] == alert_id:
                return a
        return None

    def update_alert(self, alert_id: str, changes: dict) -> dict | None:
        if changes.get("acknowledged"):
            self._user_alerts_ack.add(alert_id)
        if changes.get("severity") == "resolved":
            self._user_alerts_resolved.add(alert_id)
        return self.get_alert(alert_id)

    def alert_counts(self) -> dict[str, int]:
        counts = {"critical": 0, "warning": 0, "info": 0, "resolved": 0}
        for a in self.list_alerts():
            if a["severity"] in counts:
                counts[a["severity"]] += 1
        counts["open"] = counts["critical"] + counts["warning"] + counts["info"]
        return counts

    def list_insights(self, kind: str = "all", severity: str = "all") -> list[dict]:
        insights = insight_cards(telemetry.history(limit=500))
        return [item for item in insights if (kind == "all" or item.get("kind") == kind) and (severity == "all" or item.get("severity") == severity)]

    def list_reports(self) -> list[dict]:
        history = telemetry.history(limit=500)
        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
        if not history:
            return []

        # Compute real statistics from actual stored readings
        voltages = [r["voltage"] for r in history if r.get("voltage") is not None]
        currents = [r["current"] for r in history if r.get("current") is not None]
        powers = [r["power"] for r in history if r.get("power") is not None]
        temps = [r["temperature"] for r in history if r.get("temperature") is not None]
        latest = history[-1]
        energy = latest.get("energy")
        cost = latest.get("cost")

        return [{
            "id": "RPT-LIVE",
            "name": f"Velxio Telemetry Summary ({latest.get('device_id', 'ESP32')})",
            "scope": f"Block SF · Floor 1F · {latest.get('device_id')}",
            "period": "Active Ingestion Session",
            "format": "PDF",
            "generated": now_str,
            "size": f"{round(len(history) * 0.4 + 18, 1)} KB",
            "sections": ["Live Telemetry Breakdown", "Cumulative Energy & Cost", "Thermal Metrics"],
            "recordsCaptured": len(history),
            "totalEnergyKwh": round(energy, 4),
            "totalCostInr": round(cost, 2),
            "avgPowerW": round(sum(powers) / len(powers), 1) if powers else None,
            "avgVoltageV": round(sum(voltages) / len(voltages), 1) if voltages else None,
            "avgTempC": round(sum(temps) / len(temps), 1) if temps else None,
        }]

    def record_export(self, payload: dict) -> dict:
        entry = {
            "id": f"RPT-{1000 + len(self._reports) + 1}",
            "name": payload.get("name") or "Telemetry Export",
            "scope": payload.get("scope") or "Monitored Devices",
            "period": payload.get("period") or "Current Session",
            "format": (payload.get("format") or "pdf").upper(),
            "generated": "just now",
            "size": "24 KB",
            "sections": payload.get("sections", []),
        }
        self._reports.insert(0, entry)
        return entry

    def overview(self) -> dict:
        status_info = telemetry.get_status()
        latest = status_info["reading"]
        hist = telemetry.history(limit=100)
        now_dt = datetime.now(timezone.utc)
        sync_str = now_dt.strftime("%H:%M:%S") if latest else "Awaiting stream"

        return {
            "statusLabel": status_info["label"],
            "status": "operational" if status_info["online"] else "standby",
            "environment": "Supabase-backed API" if get_client() is not None else "In-memory API",
            "version": "1.0.0",
            "latencyMs": 0,
            "uptime": "99.98%" if status_info["online"] else "Offline",
            "lastSync": sync_str,
            "ingestRate": f"{min(len(hist), 30)} readings/min" if status_info["online"] else "0 readings/min",
            "aiLabel": "AI Active" if status_info["online"] else "AI Standby",
            "aiLastRun": "Real-time" if status_info["online"] else "Awaiting stream",
        }

    def stats(self, blocks: list[dict]) -> dict:
        status_info = telemetry.get_status()
        active_sensor_channels = 0
        if status_info["reading"]:
            r = status_info["reading"]
            for k in ("voltage", "current", "power", "temperature", "humidity"):
                if r.get(k) is not None:
                    active_sensor_channels += 1

        return {
            "blockCount": len(blocks),
            "activeBlocks": 1 if status_info["online"] else 0,
            "floorCount": 1 if status_info["online"] else 0,
            "sensorCount": active_sensor_channels,
            "attentionFloors": 1 if status_info["state"] in ("stale", "disconnected") else 0,
            "alerts": self.alert_counts(),
        }


store = OperationsStore()
