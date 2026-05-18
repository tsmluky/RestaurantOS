"""Employee management schemas."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=255)
    kiosk_pin: str | None = Field(default=None, min_length=4, max_length=6, pattern=r"^[0-9]+$")
    primary_restaurant_id: UUID | None = None
    employee_code: str | None = Field(default=None, max_length=30)
    contract_hours_week: int | None = Field(default=None, ge=0, le=80)
    hired_at: date | None = None
    notes: str | None = None


class EmployeeUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    primary_restaurant_id: UUID | None = None
    employee_code: str | None = Field(default=None, max_length=30)
    contract_hours_week: int | None = Field(default=None, ge=0, le=80)
    hired_at: date | None = None
    terminated_at: date | None = None
    notes: str | None = None
    status: Literal["ACTIVE", "INACTIVE", "TERMINATED"] | None = None


class EmployeeResetPinRequest(BaseModel):
    kiosk_pin: str | None = Field(default=None, min_length=4, max_length=6, pattern=r"^[0-9]+$")


class EmployeeResetPinResponse(BaseModel):
    employee_id: UUID
    kiosk_pin: str


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    profile_id: UUID
    full_name: str
    email: str | None
    phone: str | None
    role: str
    status: str
    primary_restaurant_id: UUID | None
    employee_code: str | None
    contract_hours_week: int | None
    hired_at: date | None
    terminated_at: date | None
    created_at: datetime
