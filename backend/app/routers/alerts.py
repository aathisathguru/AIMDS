"""Alert feed and acknowledgement."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_user
from app.schemas import AlertPatch
from app.services.operations import store as ops

router = APIRouter(prefix="/alerts", tags=["alerts"], dependencies=[Depends(require_user)])


@router.get("", summary="Filterable alert feed")
def list_alerts(
    severity: str = Query(default="all"),
    block: str | None = Query(default=None),
) -> list[dict]:
    return ops.list_alerts(severity=severity, block=block)


@router.get("/counts", summary="Counts per severity")
def counts() -> dict:
    return ops.alert_counts()


@router.patch("/{alert_id}", summary="Acknowledge or resolve")
def patch_alert(alert_id: str, payload: AlertPatch) -> dict:
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No changes supplied")
    alert = ops.update_alert(alert_id.upper(), changes)
    if alert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Alert {alert_id} not found")
    return alert
