"""Tenant + admin schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CreateTenantRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9-]+$")
    timezone: str = Field(default="Europe/Madrid", max_length=60)
    plan_code: str = Field(default="starter", max_length=30)
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
    created_at: datetime


class CreateTenantResponse(BaseModel):
    tenant: TenantResponse
    manager_user_id: UUID
    magic_link_token: str
