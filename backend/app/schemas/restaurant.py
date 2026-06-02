"""Restaurant/location schemas."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RestaurantCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str | None = None
    timezone: str = Field(default="Europe/Madrid", max_length=60)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    geofence_radius_m: int = Field(default=100, ge=25, le=500)
    late_tolerance_min: int = Field(default=10, ge=0, le=120)
    max_session_hours: int = Field(default=14, ge=1, le=24)


class RestaurantUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = None
    timezone: str | None = Field(default=None, max_length=60)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    geofence_radius_m: int | None = Field(default=None, ge=25, le=500)
    late_tolerance_min: int | None = Field(default=None, ge=0, le=120)
    max_session_hours: int | None = Field(default=None, ge=1, le=24)


class RestaurantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    address: str | None
    timezone: str
    latitude: Decimal | None
    longitude: Decimal | None
    geofence_radius_m: int
    late_tolerance_min: int
    max_session_hours: int
    created_at: datetime
    updated_at: datetime
