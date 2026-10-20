"""Sensor inventory."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_user
from app.services.estate import store as estate

router = APIRouter(prefix="/sensors", tags=["sensors"], dependencies=[Depends(require_user)])


@router.get("", summary="Filterable sensor list")
def list_sensors(
    block: str | None = Query(default=None, description="Block code, e.g. SF"),
    floor: str | None = Query(default=None, description="Floor code, e.g. 1F"),
    type: str | None = Query(default=None, description="Utility key, e.g. energy"),
    status_: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    rows = estate.all_sensors()
    if block and block != "all":
        rows = [s for s in rows if s["blockCode"] == block.upper()]
    if floor and floor != "all":
        rows = [s for s in rows if s["floorCode"] == floor.upper()]
    if type and type != "all":
        rows = [s for s in rows if s["key"] == type]
    if status_ and status_ != "all":
        rows = [s for s in rows if s["status"] == status_]
    return rows


@router.get("/{sensor_id}", summary="One sensor")
def get_sensor(sensor_id: str) -> dict:
    match = next((s for s in estate.all_sensors() if s["id"] == sensor_id.upper()), None)
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Sensor {sensor_id} not found")
    return match
