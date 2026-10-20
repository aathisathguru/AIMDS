"""Authenticated SMS notification settings and delivery history."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import require_user
from app.schemas import NotificationSettingsPatch, SmsTestRequest
from app.services.notifications import (
    _record,
    _twilio_send,
    get_settings,
    list_history,
    update_settings,
    validate_mobile_number,
)
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"], dependencies=[Depends(require_user)])


@router.get("/settings")
def notification_settings(user: dict = Depends(require_user)) -> dict:
    return get_settings(user["id"])


@router.patch("/settings")
def patch_notification_settings(payload: NotificationSettingsPatch, user: dict = Depends(require_user)) -> dict:
    try:
        return update_settings(user["id"], payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/history")
def notification_history(
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(require_user),
) -> list[dict]:
    return list_history(user["id"], limit)


@router.post("/test-sms")
def test_sms(payload: SmsTestRequest, user: dict = Depends(require_user)) -> dict:
    recipient = get_settings(user["id"])
    try:
        phone = validate_mobile_number(recipient.get("mobile_number"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not phone:
        raise HTTPException(status_code=422, detail="Configure a valid mobile number before sending a test SMS.")

    occurred_at = datetime.now(timezone.utc).isoformat()
    status, provider_id, error_message = _twilio_send(phone, payload.message)
    row = _record({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "alert_id": "TEST-SMS",
        "trigger_key": f"TEST-SMS:{occurred_at}",
        "alert_type": "gateway_test",
        "severity": "info",
        "detected_value": None,
        "unit": None,
        "occurred_at": occurred_at,
        "to_number": phone,
        "status": status,
        "provider_message_id": provider_id,
        "error_message": error_message,
        "created_at": occurred_at,
    })
    if status == "not_configured":
        raise HTTPException(status_code=503, detail={"message": error_message, "delivery": row})
    if status == "failed":
        raise HTTPException(status_code=502, detail={"message": error_message, "delivery": row})
    return row
