"""Velxio device telemetry endpoints and WebSocket streaming."""
from __future__ import annotations

import secrets
from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from app.core.config import settings
from app.core.security import require_user
from app.schemas import TelemetryReading, TelemetryResponse
from app.services.telemetry import telemetry

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


def require_device_token(x_aimds_device_token: str | None = Header(default=None)) -> None:
    configured = settings.telemetry_ingest_token
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telemetry ingestion is disabled until AIMDS_TELEMETRY_INGEST_TOKEN is configured.",
        )
    if not x_aimds_device_token or not secrets.compare_digest(x_aimds_device_token, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token")


@router.post("/ingest", response_model=TelemetryResponse, status_code=status.HTTP_202_ACCEPTED)
def ingest_reading(
    reading: TelemetryReading,
    _: None = Depends(require_device_token),
) -> dict:
    """Accept one reading from the Velxio ESP32 simulation."""
    return telemetry.ingest(reading)


@router.get("/latest", response_model=TelemetryResponse | None, dependencies=[Depends(require_user)])
def latest_reading(device_id: str | None = Query(default=None, alias="deviceId")) -> dict | None:
    """Return the most recently received reading."""
    return telemetry.latest(device_id)


@router.get("/history", response_model=list[TelemetryResponse], dependencies=[Depends(require_user)])
def reading_history(
    device_id: str | None = Query(default=None, alias="deviceId"),
    limit: int = Query(default=60, ge=1, le=500),
) -> list[dict]:
    """Return a bounded chronological history for the live chart."""
    return telemetry.history(device_id, limit)


@router.get("/status", dependencies=[Depends(require_user)])
def device_status(
    device_id: str | None = Query(default=None, alias="deviceId"),
    stale_timeout: float = Query(default=15.0, alias="staleTimeout"),
) -> dict:
    """Return connection state strictly derived from real incoming telemetry timestamps."""
    return telemetry.get_status(device_id, stale_timeout)


@router.websocket("/ws")
async def telemetry_websocket(websocket: WebSocket) -> None:
    """Real-time bi-directional WebSocket connection for instant telemetry updates."""
    await telemetry.ws_manager.connect(websocket)
    # Send the latest known state immediately on connect
    latest = telemetry.latest()
    if latest:
        await websocket.send_json({"type": "init", "data": latest})
    try:
        while True:
            # Keep connection open, accept client commands (like ping/pong or settings)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        telemetry.ws_manager.disconnect(websocket)
    except Exception:
        telemetry.ws_manager.disconnect(websocket)
