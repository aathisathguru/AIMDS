"""Pydantic request/response models for the AIMDS API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Severity = Literal["critical", "warning", "info", "resolved"]
RangeId = Literal["24h", "7d", "6w", "6m"]


class BlockCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60, examples=["Lotus"])
    code: str = Field(min_length=1, max_length=12, examples=["LT"])
    floorCount: int = Field(default=3, ge=0, le=12)
    category: str = Field(default="academic", max_length=30)
    subCategory: str | None = Field(default=None, max_length=30)
    location: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=400)


class AlertPatch(BaseModel):
    acknowledged: bool | None = None
    severity: Severity | None = None


class ReportExport(BaseModel):
    name: str | None = None
    scope: str | None = None
    period: str | None = None
    format: Literal["pdf", "csv"] = "pdf"
    sections: list[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, examples=["ops@aimds.io"])
    password: str | None = None


class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=4, max_length=100)
    role: str | None = Field(default="Operations Engineer", max_length=60)


class GoogleAuthRequest(BaseModel):
    credential: str | None = None
    email: str | None = None
    name: str | None = None
    picture: str | None = None


class NotificationSettingsPatch(BaseModel):
    mobile_number: str | None = Field(default=None, max_length=20)
    sms_enabled: bool = True
    sms_critical: bool = True
    sms_warning: bool = True
    sms_info: bool = False
    cooldown_seconds: int = Field(default=900, ge=60, le=86_400)


class SmsTestRequest(BaseModel):
    """Explicit test request; sending still requires configured Twilio credentials."""
    message: str = Field(default="AIMDS SMS gateway test", min_length=1, max_length=300)


class LoginResponse(BaseModel):
    token: str
    user: dict[str, Any]


class Health(BaseModel):
    api: str
    database: str
    ai: str


class TelemetryReading(BaseModel):
    device_id: str = Field(min_length=1, max_length=80, alias="deviceId")
    voltage: float | None = Field(default=None, ge=0, le=1000)
    current: float | None = Field(default=None, ge=0, le=10000)
    power: float | None = Field(default=None, ge=0, le=100000)
    energy: float | None = Field(default=None, ge=0)
    cost: float | None = Field(default=None, ge=0)
    temperature: float | None = Field(default=None, ge=-80, le=150)
    humidity: float | None = Field(default=None, ge=0, le=100)
    timestamp: datetime | None = None
    status: Literal["online", "offline", "degraded"] = "online"
    connection_status: str | None = Field(default=None, alias="connectionStatus")
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}

    @field_validator("device_id")
    @classmethod
    def normalize_device_id(cls, value: str) -> str:
        return value.strip()


class TelemetryResponse(TelemetryReading):
    received_at: datetime = Field(alias="receivedAt")
    online: bool
    model_config = {"populate_by_name": True}
