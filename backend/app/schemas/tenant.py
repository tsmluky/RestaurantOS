"""Tenant + admin schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CreateTenantRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9-]+$")
    timezone: str = Field(default="Europe/Madrid", max_length=60)
    plan_code: str = Field(default="starter", max_length=30)
    checkout_reminder_grace_minutes: int = Field(default=30, ge=5, le=240)
    manager_email: EmailStr
    manager_full_name: str = Field(min_length=2, max_length=120)
    restaurant_name: str | None = Field(default=None, max_length=120)


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    status: str
    plan_code: str
    timezone: str
    checkout_reminder_grace_minutes: int
    created_at: datetime


class CreateTenantResponse(BaseModel):
    tenant: TenantResponse
    manager_user_id: UUID
    magic_link_token: str


class CreateManagerRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    role: str = Field(default="MANAGER", pattern=r"^(OWNER|MANAGER)$")


class CreateManagerResponse(BaseModel):
    user_id: UUID
    magic_link_token: str


class CreateRestaurantRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str | None = None
    timezone: str = Field(default="Europe/Madrid", max_length=60)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    geofence_radius_m: int = Field(default=100, ge=25, le=500)
