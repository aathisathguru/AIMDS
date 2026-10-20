"""Live device telemetry ingestion, persistent aggregation and real-time streaming service."""
from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

from app.core.config import settings
from app.core.supabase import get_client
from app.schemas import TelemetryReading
from app.services.alert_rules import alerts_for_reading
from app.services.notifications import dispatch_alert


class WebSocketManager:
    """Manages active browser WebSocket connections for zero-latency live telemetry."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


class TelemetryStore:
    def __init__(self) -> None:
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=settings.telemetry_history_limit)
        )
        self._energy_acc: dict[str, float] = defaultdict(float)
        self._last_reading_time: dict[str, datetime] = {}
        self._tariff: float = 7.50  # Configurable INR tariff per kWh
        self._ws_manager = WebSocketManager()
        # Mapping from deviceId to estate block and floor
        self._device_mappings: dict[str, dict[str, str]] = {
            "ESP32-AIMDS-01": {"blockCode": "SF", "floorCode": "1F"},
            "VELXIO-ESP32-01": {"blockCode": "SF", "floorCode": "1F"},
        }

    @property
    def ws_manager(self) -> WebSocketManager:
        return self._ws_manager

    def set_tariff(self, tariff: float) -> None:
        self._tariff = max(0.1, float(tariff))

    def map_device(self, device_id: str, block_code: str, floor_code: str) -> None:
        self._device_mappings[device_id] = {"blockCode": block_code.upper(), "floorCode": floor_code.upper()}

    def get_mapping(self, device_id: str) -> dict[str, str]:
        return self._device_mappings.get(device_id, {})

    def get_device_for_location(self, block_code: str, floor_code: str | None = None) -> str | None:
        block_norm = block_code.upper()
        floor_norm = floor_code.upper() if floor_code else None
        for dev_id, loc in self._device_mappings.items():
            if loc.get("blockCode") == block_norm:
                if floor_norm is None or loc.get("floorCode") == floor_norm:
                    return dev_id
        # If any device is transmitting and matches primary block
        if block_norm == "SF" and self._history:
            return next(iter(self._history.keys()))
        return None

    def _normalise(self, reading: TelemetryReading) -> dict[str, Any]:
        received_at = datetime.now(timezone.utc)
        timestamp = reading.timestamp or received_at
        row = reading.model_dump(by_alias=False)

        # 1. Calculate Power if missing but V and I are valid
        power = reading.power
        if power is None and reading.voltage is not None and reading.current is not None:
            power = round(reading.voltage * reading.current, 2)

        # 2. Compute Energy incrementally: E = P * dt
        energy_kwh = None
        cost = None
        if power is not None and power >= 0:
            last_dt = self._last_reading_time.get(reading.device_id)
            if last_dt is not None:
                delta_sec = (received_at - last_dt).total_seconds()
                if 0.05 <= delta_sec <= 300.0:
                    inc_kwh = (power / 1000.0) * (delta_sec / 3600.0)
                    self._energy_acc[reading.device_id] += inc_kwh
            self._last_reading_time[reading.device_id] = received_at
            energy_kwh = round(self._energy_acc[reading.device_id], 4)
            cost = round(energy_kwh * self._tariff, 2)

        mapping = self.get_mapping(reading.device_id)
        metadata_mapping = reading.metadata or {}
        block_code = metadata_mapping.get("blockCode") or mapping.get("blockCode")
        floor_code = metadata_mapping.get("floorCode") or mapping.get("floorCode")

        row.update({
            "device_id": reading.device_id,
            "voltage": reading.voltage,
            "current": reading.current,
            "power": power,
            "energy": energy_kwh,
            "cost": cost,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
            "timestamp": timestamp.isoformat(),
            "received_at": received_at.isoformat(),
            "online": reading.status == "online",
            "connection_status": reading.connection_status or reading.status,
            "block_code": block_code,
            "floor_code": floor_code,
        })
        return row

    def ingest(self, reading: TelemetryReading) -> dict[str, Any]:
        row = self._normalise(reading)
        self._history[reading.device_id].append(row)

        # Evaluate the same threshold rules shown by the alert feed. Delivery is
        # recorded as submitted/failed/not_configured; no success is inferred.
        for alert in alerts_for_reading(row):
            dispatch_alert(alert)

        # Persist to Supabase when configured
        client = get_client()
        if client is not None:
            try:
                client.table("aimds_telemetry_readings").insert(row).execute()
            except Exception:
                pass

        # Broadcast via WebSockets asynchronously
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._ws_manager.broadcast({"type": "telemetry", "data": row}))
        except RuntimeError:
            pass

        return row

    def latest(self, device_id: str | None = None) -> dict[str, Any] | None:
        if device_id:
            rows = list(self._history.get(device_id, ()))
            if rows:
                return rows[-1]
        elif self._history:
            rows = [values[-1] for values in self._history.values() if values]
            if rows:
                return max(rows, key=lambda row: row["received_at"])

        client = get_client()
        if client is None:
            return None
        try:
            query = client.table("aimds_telemetry_readings").select("*").order("received_at", desc=True).limit(1)
            if device_id:
                query = query.eq("device_id", device_id)
            result = query.execute()
            return (result.data or [None])[0]
        except Exception:
            return None

    def history(self, device_id: str | None = None, limit: int = 60) -> list[dict[str, Any]]:
        limit = min(max(limit, 1), 500)
        rows = (
            list(self._history.get(device_id, ()))
            if device_id
            else [row for values in self._history.values() for row in values]
        )
        if rows:
            return sorted(rows, key=lambda row: row["received_at"])[-limit:]

        client = get_client()
        if client is None:
            return []
        try:
            query = client.table("aimds_telemetry_readings").select("*").order("received_at", desc=True).limit(limit)
            if device_id:
                query = query.eq("device_id", device_id)
            result = query.execute()
            return list(reversed(result.data or []))
        except Exception:
            return []

    def get_status(self, device_id: str | None = None, stale_timeout: float = 15.0) -> dict[str, Any]:
        """Calculates true dynamic connectivity state strictly from actual received timestamps."""
        lat = self.latest(device_id)
        if not lat:
            return {
                "state": "waiting",
                "label": "Waiting for sensor data",
                "last_seen_sec": None,
                "reading": None,
                "online": False,
            }

        rec_str = lat["received_at"].replace("Z", "+00:00")
        try:
            rec_dt = datetime.fromisoformat(rec_str)
            elapsed = (datetime.now(timezone.utc) - rec_dt).total_seconds()
        except Exception:
            elapsed = 0.0

        if elapsed > 40.0:
            state = "disconnected"
            label = "Device offline"
            online = False
        elif elapsed > stale_timeout:
            state = "stale"
            label = "Telemetry stale"
            online = False
        else:
            state = "connected"
            label = "Streaming live"
            online = True

        return {
            "state": state,
            "label": label,
            "last_seen_sec": round(elapsed, 1),
            "reading": lat,
            "online": online,
        }


telemetry = TelemetryStore()


async def run_realtime_telemetry_stream() -> None:
    """
    Continuously generates and broadcasts live real-time device telemetry.
    Streams realistic electrical and environmental sensor packets every 1.5 seconds.
    """
    import math
    import random

    device_id = "VELXIO-ESP32-01"
    base_v = 230.0
    base_i = 2.5
    base_t = 24.5
    base_h = 52.0
    step = 0

    while True:
        try:
            await asyncio.sleep(1.5)
            step += 1
            # Dynamic fluctuations with realistic physics (sinusoidal load curve + micro-variations)
            v_var = math.sin(step * 0.12) * 2.4 + random.uniform(-0.5, 0.5)
            i_var = math.cos(step * 0.08) * 0.35 + random.uniform(-0.06, 0.06)
            voltage = round(base_v + v_var, 2)
            current = round(max(0.1, base_i + i_var), 3)
            power = round(voltage * current, 1)

            t_var = math.sin(step * 0.04) * 0.7 + random.uniform(-0.1, 0.1)
            h_var = math.cos(step * 0.04) * 1.8 + random.uniform(-0.4, 0.4)
            temperature = round(base_t + t_var, 2)
            humidity = round(min(98.0, max(15.0, base_h + h_var)), 1)

            reading = TelemetryReading(
                deviceId=device_id,
                voltage=voltage,
                current=current,
                power=power,
                temperature=temperature,
                humidity=humidity,
                timestamp=datetime.now(timezone.utc),
                status="online",
                connectionStatus="online",
                metadata={"blockCode": "SF", "floorCode": "1F"},
            )
            telemetry.ingest(reading)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1.0)

