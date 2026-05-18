"""Clock-in/out, incidents and session schemas."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import IncidentStatus, IncidentType, VerificationMethod


class ClockActionRequest(BaseModel):
    restaurant_id: UUID
    verification_method: VerificationMethod = VerificationMethod.GPS
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    device_id: str | None = Field(default=None, max_length=120)
    client_event_at: datetime | None = None
    idempotency_key: str = Field(min_length=8, max_length=120)


class ClockActionResponse(BaseModel):
    status: str
    work_session_id: UUID
    event_id: UUID
    event_at: datetime
    duration_minutes: int | None = None
    verification_status: str
    distance_m: int | None = None
    flagged_reasons: list[str] = Field(default_factory=list)


class KioskClockRequest(BaseModel):
    restaurant_id: UUID
    employee_pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]+$")
    action: str = Field(default="AUTO", pattern=r"^(AUTO|CLOCK_IN|CLOCK_OUT)$")
    device_id: str | None = Field(default=None, max_length=120)
    client_event_at: datetime | None = None
    idempotency_key: str = Field(min_length=8, max_length=120)


class KioskClockResponse(ClockActionResponse):
    employee_id: UUID
    employee_name: str


class ClockStatusResponse(BaseModel):
    status: str
    work_session_id: UUID | None = None
    restaurant_id: UUID | None = None
    restaurant_name: str | None = None
    clock_in_at: datetime | None = None
    elapsed_minutes: int | None = None
    pending_incidents: int = 0
    flagged_reasons: list[str] = Field(default_factory=list)


class WorkSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    restaurant_id: UUID
    user_id: UUID
    clock_in_at: datetime
    clock_out_at: datetime | None
    duration_minutes: int | None
    status: str
    was_corrected: bool
    flagged_reasons: list[str] | None
    created_at: datetime
    updated_at: datetime


class ClockHistoryResponse(BaseModel):
    items: list[WorkSessionResponse]


class IncidentCreateRequest(BaseModel):
    restaurant_id: UUID
    type: IncidentType
    affected_date: date
    suggested_clock_in_at: datetime | None = None
    suggested_clock_out_at: datetime | None = None
    related_work_session_id: UUID | None = None
    description: str | None = Field(default=None, max_length=1000)


class IncidentUpdateRequest(BaseModel):
    status: IncidentStatus
    resolution_note: str | None = Field(default=None, max_length=1000)


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    user_id: UUID
    restaurant_id: UUID
    type: str
    affected_date: date
    suggested_clock_in_at: datetime | None
    suggested_clock_out_at: datetime | None
    description: str | None
    status: str
    resolved_by_user_id: UUID | None
    resolved_at: datetime | None
    resolution_note: str | None
    related_work_session_id: UUID | None
    created_at: datetime
    updated_at: datetime


class WorkSessionPatchRequest(BaseModel):
    status: str | None = None
    flagged_reasons: list[str] | None = None


class ClockCorrectionRequest(BaseModel):
    work_session_id: UUID
    new_clock_in_at: datetime | None = None
    new_clock_out_at: datetime | None = None
    reason: str = Field(min_length=5, max_length=1000)
    incident_id: UUID | None = None


class ClockCorrectionResponse(BaseModel):
    correction_id: UUID
    work_session: WorkSessionResponse
