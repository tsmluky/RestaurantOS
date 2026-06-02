"""Employee clock-in/out endpoints."""
from datetime import UTC, datetime
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, TenantId, require_staff
from app.core.security import verify_pin
from app.models.audit import AuditLog
from app.models.enums import (
    ClockEventSource,
    ClockEventType,
    IncidentStatus,
    SessionStatus,
    UserRole,
    UserStatus,
    VerificationStatus,
)
from app.models.incident import ClockIncident
from app.models.restaurant import Restaurant
from app.models.time_clock import TimeClockEvent, WorkSession
from app.models.user import User
from app.schemas.clock import (
    ClockActionRequest,
    ClockActionResponse,
    ClockHistoryResponse,
    ClockStatusResponse,
    IncidentCreateRequest,
    IncidentResponse,
    KioskClockRequest,
    KioskClockResponse,
)

router = APIRouter()


def _distance_m(
    lat1: Decimal | None,
    lon1: Decimal | None,
    lat2: Decimal | None,
    lon2: Decimal | None,
) -> int | None:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    radius_m = 6_371_000
    phi1 = radians(float(lat1))
    phi2 = radians(float(lat2))
    delta_phi = radians(float(lat2 - lat1))
    delta_lambda = radians(float(lon2 - lon1))
    a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    return round(radius_m * 2 * asin(sqrt(a)))


def _get_restaurant(db: Session, tenant_id, restaurant_id) -> Restaurant:
    restaurant = db.scalar(
        select(Restaurant).where(
            Restaurant.id == restaurant_id,
            Restaurant.tenant_id == tenant_id,
            Restaurant.deleted_at.is_(None),
        )
    )
    if restaurant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
    return restaurant


def _open_session(db: Session, tenant_id, user_id) -> WorkSession | None:
    return db.scalar(
        select(WorkSession).where(
            WorkSession.tenant_id == tenant_id,
            WorkSession.user_id == user_id,
            WorkSession.status == SessionStatus.OPEN.value,
        )
    )


def _verification_result(
    restaurant: Restaurant,
    payload: ClockActionRequest,
) -> tuple[str, int | None, list[str]]:
    distance = _distance_m(
        payload.latitude,
        payload.longitude,
        restaurant.latitude,
        restaurant.longitude,
    )
    flagged: list[str] = []

    if payload.latitude is None or payload.longitude is None:
        flagged.append("missing_gps")
    elif distance is not None and distance > restaurant.geofence_radius_m:
        flagged.append("outside_geofence")

    return (
        VerificationStatus.WARNING.value if flagged else VerificationStatus.VERIFIED.value,
        distance,
        flagged,
    )


def _duplicate_event(
    db: Session,
    tenant_id,
    user_id,
    idempotency_key: str,
) -> TimeClockEvent | None:
    return db.scalar(
        select(TimeClockEvent).where(
            TimeClockEvent.tenant_id == tenant_id,
            TimeClockEvent.user_id == user_id,
            TimeClockEvent.idempotency_key == idempotency_key,
        )
    )


def _find_employee_by_pin(db: Session, tenant_id, pin: str) -> User | None:
    employees = db.scalars(
        select(User).where(
            User.tenant_id == tenant_id,
            User.role == UserRole.EMPLOYEE.value,
            User.status == UserStatus.ACTIVE.value,
            User.deleted_at.is_(None),
        )
    ).all()
    for employee in employees:
        if employee.pin_hash and verify_pin(pin, employee.pin_hash):
            return employee
    return None


def _build_event(
    *,
    tenant_id,
    restaurant_id,
    user_id,
    event_type: str,
    event_at: datetime,
    client_event_at: datetime | None,
    source: str,
    verification_method: str,
    verification_status: str,
    device_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
    latitude: Decimal | None,
    longitude: Decimal | None,
    distance_m: int | None,
    idempotency_key: str,
) -> TimeClockEvent:
    return TimeClockEvent(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        user_id=user_id,
        event_type=event_type,
        event_at=event_at,
        client_event_at=client_event_at,
        source=source,
        verification_method=verification_method,
        verification_status=verification_status,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        latitude=latitude,
        longitude=longitude,
        distance_m=distance_m,
        idempotency_key=idempotency_key,
    )


@router.get("/status", response_model=ClockStatusResponse)
def get_clock_status(
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ClockStatusResponse:
    open_session = _open_session(db, tenant_id, user.id)
    pending_incidents = db.scalar(
        select(func.count(ClockIncident.id)).where(
            ClockIncident.tenant_id == tenant_id,
            ClockIncident.user_id == user.id,
            ClockIncident.status == IncidentStatus.PENDING.value,
        )
    )
    if open_session is None:
        return ClockStatusResponse(status="OFF_DUTY", pending_incidents=pending_incidents or 0)

    restaurant = db.get(Restaurant, open_session.restaurant_id)
    now = datetime.now(UTC)
    elapsed = round((now - open_session.clock_in_at).total_seconds() / 60)
    return ClockStatusResponse(
        status="CLOCKED_IN",
        work_session_id=open_session.id,
        restaurant_id=open_session.restaurant_id,
        restaurant_name=restaurant.name if restaurant else None,
        clock_in_at=open_session.clock_in_at,
        elapsed_minutes=elapsed,
        pending_incidents=pending_incidents or 0,
        flagged_reasons=open_session.flagged_reasons or [],
    )


@router.post("/in", response_model=ClockActionResponse)
def clock_in(
    payload: ClockActionRequest,
    tenant_id: TenantId,
    user: CurrentUser,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> ClockActionResponse:
    if user.role not in {UserRole.EMPLOYEE.value, UserRole.MANAGER.value, UserRole.OWNER.value}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Rol no permitido para fichar")

    duplicate = _duplicate_event(db, tenant_id, user.id, payload.idempotency_key)
    if duplicate is not None and duplicate.work_session_id is not None:
        session = db.get(WorkSession, duplicate.work_session_id)
        if session is not None:
            return ClockActionResponse(
                status="CLOCKED_IN",
                work_session_id=session.id,
                event_id=duplicate.id,
                event_at=duplicate.event_at,
                verification_status=duplicate.verification_status,
                distance_m=duplicate.distance_m,
                flagged_reasons=session.flagged_reasons or [],
            )

    if _open_session(db, tenant_id, user.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Ya tienes una sesión abierta")

    restaurant = _get_restaurant(db, tenant_id, payload.restaurant_id)
    verification_status, distance, flagged = _verification_result(restaurant, payload)
    now = datetime.now(UTC)

    event = _build_event(
        tenant_id=tenant_id,
        restaurant_id=restaurant.id,
        user_id=user.id,
        event_type=ClockEventType.CLOCK_IN.value,
        event_at=now,
        client_event_at=payload.client_event_at,
        source=ClockEventSource.MOBILE_APP.value,
        verification_method=payload.verification_method.value,
        verification_status=verification_status,
        device_id=payload.device_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        latitude=payload.latitude,
        longitude=payload.longitude,
        distance_m=distance,
        idempotency_key=payload.idempotency_key,
    )
    db.add(event)
    db.flush()

    session = WorkSession(
        tenant_id=tenant_id,
        restaurant_id=restaurant.id,
        user_id=user.id,
        clock_in_event_id=event.id,
        clock_in_at=now,
        status=SessionStatus.OPEN.value,
        flagged_reasons=flagged or None,
    )
    db.add(session)
    db.flush()
    event.work_session_id = session.id

    if flagged:
        db.add(
            AuditLog(
                tenant_id=tenant_id,
                actor_user_id=user.id,
                action="clock.in.warning",
                target_type="work_session",
                target_id=session.id,
                payload={"flagged_reasons": flagged, "distance_m": distance},
            )
        )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Fichaje duplicado") from exc

    return ClockActionResponse(
        status="CLOCKED_IN",
        work_session_id=session.id,
        event_id=event.id,
        event_at=event.event_at,
        verification_status=verification_status,
        distance_m=distance,
        flagged_reasons=flagged,
    )


@router.post("/out", response_model=ClockActionResponse)
def clock_out(
    payload: ClockActionRequest,
    tenant_id: TenantId,
    user: CurrentUser,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> ClockActionResponse:
    duplicate = _duplicate_event(db, tenant_id, user.id, payload.idempotency_key)
    if duplicate is not None and duplicate.work_session_id is not None:
        session = db.get(WorkSession, duplicate.work_session_id)
        if session is not None:
            return ClockActionResponse(
                status="OFF_DUTY",
                work_session_id=session.id,
                event_id=duplicate.id,
                event_at=duplicate.event_at,
                duration_minutes=session.duration_minutes,
                verification_status=duplicate.verification_status,
                distance_m=duplicate.distance_m,
                flagged_reasons=session.flagged_reasons or [],
            )

    session = _open_session(db, tenant_id, user.id)
    if session is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="No tienes una sesión abierta")

    restaurant = _get_restaurant(db, tenant_id, payload.restaurant_id)
    verification_status, distance, flagged = _verification_result(restaurant, payload)
    now = datetime.now(UTC)
    all_flags = list({*(session.flagged_reasons or []), *flagged})

    event = _build_event(
        tenant_id=tenant_id,
        restaurant_id=restaurant.id,
        user_id=user.id,
        event_type=ClockEventType.CLOCK_OUT.value,
        event_at=now,
        client_event_at=payload.client_event_at,
        source=ClockEventSource.MOBILE_APP.value,
        verification_method=payload.verification_method.value,
        verification_status=verification_status,
        device_id=payload.device_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        latitude=payload.latitude,
        longitude=payload.longitude,
        distance_m=distance,
        idempotency_key=payload.idempotency_key,
    )
    db.add(event)
    db.flush()

    duration = round((now - session.clock_in_at).total_seconds() / 60)
    if duration > restaurant.max_session_hours * 60:
        all_flags.append("max_session_exceeded")

    session.clock_out_event_id = event.id
    session.clock_out_at = now
    session.duration_minutes = duration
    session.status = SessionStatus.NEEDS_REVIEW.value if all_flags else SessionStatus.CLOSED.value
    session.flagged_reasons = all_flags or None
    event.work_session_id = session.id

    if all_flags:
        db.add(
            AuditLog(
                tenant_id=tenant_id,
                actor_user_id=user.id,
                action="clock.out.warning",
                target_type="work_session",
                target_id=session.id,
                payload={"flagged_reasons": all_flags, "distance_m": distance},
            )
        )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Fichaje duplicado") from exc

    return ClockActionResponse(
        status="OFF_DUTY",
        work_session_id=session.id,
        event_id=event.id,
        event_at=event.event_at,
        duration_minutes=duration,
        verification_status=verification_status,
        distance_m=distance,
        flagged_reasons=all_flags,
    )


@router.post(
    "/kiosk",
    response_model=KioskClockResponse,
    dependencies=[Depends(require_staff)],
)
def kiosk_clock(
    payload: KioskClockRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> KioskClockResponse:
    """Clock an employee from a shared tablet using their PIN.

    MVP security model: the tablet is set up with a manager/staff session. A later
    version should replace this with a scoped device token.
    """
    restaurant = _get_restaurant(db, tenant_id, payload.restaurant_id)
    employee = _find_employee_by_pin(db, tenant_id, payload.employee_pin)
    if employee is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="PIN incorrecto")

    duplicate = _duplicate_event(db, tenant_id, employee.id, payload.idempotency_key)
    if duplicate is not None and duplicate.work_session_id is not None:
        session = db.get(WorkSession, duplicate.work_session_id)
        if session is not None:
            return KioskClockResponse(
                status="CLOCKED_IN" if session.status == SessionStatus.OPEN.value else "OFF_DUTY",
                employee_id=employee.id,
                employee_name=employee.full_name,
                work_session_id=session.id,
                event_id=duplicate.id,
                event_at=duplicate.event_at,
                duration_minutes=session.duration_minutes,
                verification_status=duplicate.verification_status,
                distance_m=duplicate.distance_m,
                flagged_reasons=session.flagged_reasons or [],
            )

    open_session = _open_session(db, tenant_id, employee.id)
    if payload.action == "CLOCK_IN" and open_session is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="El empleado ya está fichado")
    if payload.action == "CLOCK_OUT" and open_session is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="El empleado no tiene sesión abierta")

    should_clock_in = payload.action == "CLOCK_IN" or (
        payload.action == "AUTO" and open_session is None
    )
    now = datetime.now(UTC)

    if should_clock_in:
        event = _build_event(
            tenant_id=tenant_id,
            restaurant_id=restaurant.id,
            user_id=employee.id,
            event_type=ClockEventType.CLOCK_IN.value,
            event_at=now,
            client_event_at=payload.client_event_at,
            source=ClockEventSource.TABLET.value,
            verification_method="PIN",
            verification_status=VerificationStatus.VERIFIED.value,
            device_id=payload.device_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            latitude=None,
            longitude=None,
            distance_m=None,
            idempotency_key=payload.idempotency_key,
        )
        db.add(event)
        db.flush()
        session = WorkSession(
            tenant_id=tenant_id,
            restaurant_id=restaurant.id,
            user_id=employee.id,
            clock_in_event_id=event.id,
            clock_in_at=now,
            status=SessionStatus.OPEN.value,
        )
        db.add(session)
        db.flush()
        event.work_session_id = session.id
        response_status = "CLOCKED_IN"
        duration = None
    else:
        session = open_session
        if session is None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="El empleado no tiene sesión abierta",
            )
        event = _build_event(
            tenant_id=tenant_id,
            restaurant_id=restaurant.id,
            user_id=employee.id,
            event_type=ClockEventType.CLOCK_OUT.value,
            event_at=now,
            client_event_at=payload.client_event_at,
            source=ClockEventSource.TABLET.value,
            verification_method="PIN",
            verification_status=VerificationStatus.VERIFIED.value,
            device_id=payload.device_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            latitude=None,
            longitude=None,
            distance_m=None,
            idempotency_key=payload.idempotency_key,
        )
        db.add(event)
        db.flush()
        duration = round((now - session.clock_in_at).total_seconds() / 60)
        session.clock_out_event_id = event.id
        session.clock_out_at = now
        session.duration_minutes = duration
        session.status = SessionStatus.CLOSED.value
        event.work_session_id = session.id
        response_status = "OFF_DUTY"

    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="clock.kiosk",
            target_type="work_session",
            target_id=session.id,
            payload={"employee_id": str(employee.id), "action": payload.action},
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Fichaje duplicado") from exc

    return KioskClockResponse(
        status=response_status,
        employee_id=employee.id,
        employee_name=employee.full_name,
        work_session_id=session.id,
        event_id=event.id,
        event_at=event.event_at,
        duration_minutes=duration,
        verification_status=VerificationStatus.VERIFIED.value,
        flagged_reasons=[],
    )


@router.get("/history/me", response_model=ClockHistoryResponse)
def my_history(
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> ClockHistoryResponse:
    stmt = select(WorkSession).where(
        WorkSession.tenant_id == tenant_id,
        WorkSession.user_id == user.id,
    )
    if date_from is not None:
        stmt = stmt.where(WorkSession.clock_in_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(WorkSession.clock_in_at <= date_to)
    items = db.scalars(stmt.order_by(WorkSession.clock_in_at.desc()).limit(100)).all()
    return ClockHistoryResponse(items=list(items))


@router.post("/incidents", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreateRequest,
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ClockIncident:
    _get_restaurant(db, tenant_id, payload.restaurant_id)
    if payload.related_work_session_id is not None:
        session_exists = db.scalar(
            select(WorkSession.id).where(
                WorkSession.id == payload.related_work_session_id,
                WorkSession.tenant_id == tenant_id,
                WorkSession.user_id == user.id,
            )
        )
        if session_exists is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")

    incident = ClockIncident(
        tenant_id=tenant_id,
        user_id=user.id,
        restaurant_id=payload.restaurant_id,
        type=payload.type.value,
        affected_date=payload.affected_date,
        suggested_clock_in_at=payload.suggested_clock_in_at,
        suggested_clock_out_at=payload.suggested_clock_out_at,
        description=payload.description,
        related_work_session_id=payload.related_work_session_id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident
