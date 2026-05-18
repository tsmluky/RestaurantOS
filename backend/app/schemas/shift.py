"""Shift planning schemas."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Inputs ────────────────────────────────────────────────────────────────────


class ShiftCreateRequest(BaseModel):
    restaurant_id: UUID
    user_id: UUID
    starts_at: datetime
    ends_at: datetime
    role: str | None = Field(default=None, max_length=40)
    notes: str | None = None

    @model_validator(mode="after")
    def _check_range(self) -> "ShiftCreateRequest":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class ShiftUpdateRequest(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    role: str | None = Field(default=None, max_length=40)
    notes: str | None = None
    status: Literal["SCHEDULED", "CANCELLED"] | None = None

    @model_validator(mode="after")
    def _check_range(self) -> "ShiftUpdateRequest":
        if (
            self.starts_at is not None
            and self.ends_at is not None
            and self.ends_at <= self.starts_at
        ):
            raise ValueError("ends_at must be after starts_at")
        return self


# ── Outputs ───────────────────────────────────────────────────────────────────


class TeammateSummary(BaseModel):
    """Minimal teammate info shown in shift detail and team views."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    full_name: str
    role: str | None = None
    starts_at: datetime
    ends_at: datetime


class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    restaurant_id: UUID
    restaurant_name: str | None = None
    user_id: UUID
    user_full_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int
    role: str | None
    notes: str | None
    status: str
    created_at: datetime


class ShiftWithTeammates(ShiftResponse):
    teammates: list[TeammateSummary] = Field(default_factory=list)


class ShiftListResponse(BaseModel):
    items: list[ShiftResponse]


class RestaurantWeekRow(BaseModel):
    """One employee's shifts in a restaurant week view."""

    user_id: UUID
    full_name: str
    shifts: list[ShiftResponse]


class RestaurantWeekResponse(BaseModel):
    restaurant_id: UUID
    restaurant_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    rows: list[RestaurantWeekRow]
