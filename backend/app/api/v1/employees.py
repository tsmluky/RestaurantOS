"""Manager employee CRUD endpoints."""
import secrets
import string
from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, TenantId, require_manager
from app.core.security import hash_password, hash_pin, verify_pin
from app.models.audit import AuditLog
from app.models.employee import EmployeeProfile
from app.models.enums import SessionStatus, UserRole, UserStatus
from app.models.restaurant import Restaurant
from app.models.time_clock import WorkSession
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreateRequest,
    EmployeeResetPinRequest,
    EmployeeResetPinResponse,
    EmployeeResponse,
    EmployeeUpdateRequest,
)

router = APIRouter(dependencies=[Depends(require_manager)])


def _employee_response(user: User, profile: EmployeeProfile) -> EmployeeResponse:
    return EmployeeResponse(
        id=user.id,
        profile_id=profile.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        status=user.status,
        primary_restaurant_id=profile.primary_restaurant_id,
        employee_code=profile.employee_code,
        contract_hours_week=profile.contract_hours_week,
        hired_at=profile.hired_at,
        terminated_at=profile.terminated_at,
        created_at=user.created_at,
    )


def _assert_restaurant_in_tenant(
    db: Session,
    tenant_id: UUID,
    restaurant_id: UUID | None,
) -> None:
    if restaurant_id is None:
        return
    exists = db.scalar(
        select(Restaurant.id).where(
            Restaurant.id == restaurant_id,
            Restaurant.tenant_id == tenant_id,
            Restaurant.deleted_at.is_(None),
        )
    )
    if exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")


def _pin_is_in_use(
    db: Session,
    tenant_id: UUID,
    pin: str,
    exclude_user_id: UUID | None = None,
) -> bool:
    employees = db.scalars(
        select(User).where(
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.pin_hash.is_not(None),
            User.deleted_at.is_(None),
        )
    ).all()
    return any(
        employee.id != exclude_user_id and employee.pin_hash and verify_pin(pin, employee.pin_hash)
        for employee in employees
    )


def _generate_unique_pin(db: Session, tenant_id: UUID) -> str:
    for _ in range(20):
        pin = "".join(secrets.choice(string.digits) for _ in range(4))
        if not _pin_is_in_use(db, tenant_id, pin):
            return pin
    raise HTTPException(
        status.HTTP_409_CONFLICT,
        detail="No se pudo generar un PIN único",
    )


@router.get("", response_model=list[EmployeeResponse])
def list_employees(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
) -> list[EmployeeResponse]:
    rows = db.execute(
        select(User, EmployeeProfile)
        .join(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .where(
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.deleted_at.is_(None),
        )
        .order_by(User.full_name.asc())
    ).all()
    return [_employee_response(user, profile) for user, profile in rows]


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreateRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> EmployeeResponse:
    _assert_restaurant_in_tenant(db, tenant_id, payload.primary_restaurant_id)
    if payload.kiosk_pin and _pin_is_in_use(db, tenant_id, payload.kiosk_pin):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="PIN kiosk ya en uso")

    user = User(
        tenant_id=tenant_id,
        email=str(payload.email).lower() if payload.email else None,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password) if payload.password else None,
        pin_hash=hash_pin(payload.kiosk_pin) if payload.kiosk_pin else None,
        role=UserRole.EMPLOYEE.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    profile = EmployeeProfile(
        tenant_id=tenant_id,
        user_id=user.id,
        primary_restaurant_id=payload.primary_restaurant_id,
        employee_code=payload.employee_code,
        contract_hours_week=payload.contract_hours_week,
        hired_at=payload.hired_at,
        notes=payload.notes,
    )
    db.add(profile)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="employee.created",
            target_type="user",
            target_id=user.id,
            payload={
                "email": user.email,
                "primary_restaurant_id": str(profile.primary_restaurant_id),
            },
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Ya existe un empleado con esos datos",
        ) from exc

    db.refresh(user)
    db.refresh(profile)
    return _employee_response(user, profile)


@router.post("/{employee_id}/reset-pin", response_model=EmployeeResetPinResponse)
def reset_employee_pin(
    employee_id: UUID,
    payload: EmployeeResetPinRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> EmployeeResetPinResponse:
    employee = db.scalar(
        select(User).where(
            User.id == employee_id,
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.deleted_at.is_(None),
        )
    )
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    pin = payload.kiosk_pin or _generate_unique_pin(db, tenant_id)
    if _pin_is_in_use(db, tenant_id, pin, exclude_user_id=employee.id):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="PIN kiosk ya en uso")

    employee.pin_hash = hash_pin(pin)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="employee.pin_reset",
            target_type="user",
            target_id=employee.id,
        )
    )
    db.commit()
    return EmployeeResetPinResponse(employee_id=employee.id, kiosk_pin=pin)


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdateRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> EmployeeResponse:
    row = db.execute(
        select(User, EmployeeProfile)
        .join(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .where(
            User.id == employee_id,
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.deleted_at.is_(None),
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    user, profile = row
    _assert_restaurant_in_tenant(db, tenant_id, payload.primary_restaurant_id)

    update = payload.model_dump(exclude_unset=True)
    requested_status = update.get("status")
    if requested_status in {UserStatus.INACTIVE.value, UserStatus.TERMINATED.value}:
        open_session = db.scalar(
            select(WorkSession.id).where(
                WorkSession.tenant_id == tenant_id,
                WorkSession.user_id == user.id,
                WorkSession.status == SessionStatus.OPEN.value,
            )
        )
        if open_session is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="El empleado tiene una sesión abierta. Cierra o corrige el fichaje antes.",
            )

    before = {
        "full_name": user.full_name,
        "email": user.email,
        "status": user.status,
        "primary_restaurant_id": str(profile.primary_restaurant_id)
        if profile.primary_restaurant_id
        else None,
    }

    for field in ("full_name", "email", "phone", "status"):
        if field in update:
            setattr(user, field, update[field])
    if update.get("status") == UserStatus.TERMINATED.value and "terminated_at" not in update:
        profile.terminated_at = date.today()
    for field in (
        "primary_restaurant_id",
        "employee_code",
        "contract_hours_week",
        "hired_at",
        "terminated_at",
        "notes",
    ):
        if field in update:
            setattr(profile, field, update[field])

    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="employee.updated",
            target_type="user",
            target_id=user.id,
            payload={
                "before": before,
                "after": payload.model_dump(mode="json", exclude_unset=True),
            },
        )
    )
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _employee_response(user, profile)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: UUID,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    employee = db.scalar(
        select(User).where(
            User.id == employee_id,
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.deleted_at.is_(None),
        )
    )
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    open_session = db.scalar(
        select(WorkSession.id).where(
            WorkSession.tenant_id == tenant_id,
            WorkSession.user_id == employee.id,
            WorkSession.status == SessionStatus.OPEN.value,
        )
    )
    if open_session is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="El empleado tiene una sesión abierta. Cierra el fichaje antes de eliminarlo.",
        )

    employee.deleted_at = datetime.now(UTC)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="employee.deleted",
            target_type="user",
            target_id=employee.id,
            payload={"email": employee.email, "full_name": employee.full_name},
        )
    )
    db.commit()
