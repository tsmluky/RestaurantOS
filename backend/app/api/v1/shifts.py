"""Shift planning endpoints.

Employee read endpoints:
- GET /shifts/me?from=&to=               My shifts in a date range.
- GET /shifts/me/upcoming?limit=         My N next scheduled shifts.
- GET /shifts/{shift_id}                 Detail of one shift, with teammates.
- GET /shifts/restaurant/week            Restaurant-wide week view (employees can see teammates).

Manager write endpoints (require_manager):
- POST   /shifts                         Create a shift for any employee.
- GET    /shifts                         List shifts for the tenant (filterable).
- PATCH  /shifts/{shift_id}              Update an existing shift.
- DELETE /shifts/{shift_id}              Soft-cancel a shift (status=CANCELLED).
"""
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.v1.notifications import (
    PublishScheduleRequest,
    PublishScheduleResponse,
    publish_schedule_for_week,
)
from app.core.database import get_db
from app.core.deps import CurrentUser, TenantId, require_manager
from app.models.enums import ShiftStatus
from app.models.restaurant import Restaurant
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import (
    RestaurantWeekResponse,
    RestaurantWeekRow,
    ShiftCreateRequest,
    ShiftListResponse,
    ShiftResponse,
    ShiftUpdateRequest,
    ShiftWithTeammates,
    TeammateSummary,
)

router = APIRouter()

# Statuses that mean "this shift is visible to employees"
_VISIBLE_STATUSES = [ShiftStatus.PUBLISHED.value, ShiftStatus.SCHEDULED.value]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _to_response(
    shift: Shift,
    *,
    user_name: str | None = None,
    restaurant_name: str | None = None,
) -> ShiftResponse:
    duration = int((shift.ends_at - shift.starts_at).total_seconds() // 60)
    return ShiftResponse(
        id=shift.id,
        tenant_id=shift.tenant_id,
        restaurant_id=shift.restaurant_id,
        restaurant_name=restaurant_name,
        user_id=shift.user_id,
        user_full_name=user_name,
        starts_at=shift.starts_at,
        ends_at=shift.ends_at,
        duration_minutes=duration,
        role=shift.role,
        notes=shift.notes,
        checkout_reminder_sent_at=shift.checkout_reminder_sent_at,
        status=shift.status,
        created_at=shift.created_at,
    )


def _hydrate_shifts(
    db: Session, tenant_id: UUID, shifts: list[Shift]
) -> list[ShiftResponse]:
    """Fetch user + restaurant names in two queries (avoid N+1)."""
    if not shifts:
        return []
    user_ids = {s.user_id for s in shifts}
    restaurant_ids = {s.restaurant_id for s in shifts}
    user_names = {
        u.id: u.full_name
        for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    }
    restaurant_names = {
        r.id: r.name
        for r in db.scalars(
            select(Restaurant).where(
                Restaurant.id.in_(restaurant_ids), Restaurant.tenant_id == tenant_id
            )
        ).all()
    }
    return [
        _to_response(
            s,
            user_name=user_names.get(s.user_id),
            restaurant_name=restaurant_names.get(s.restaurant_id),
        )
        for s in shifts
    ]


def _get_shift_or_404(db: Session, tenant_id: UUID, shift_id: UUID) -> Shift:
    shift = db.scalar(
        select(Shift).where(Shift.id == shift_id, Shift.tenant_id == tenant_id)
    )
    if shift is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turno no encontrado")
    return shift


# ── Employee endpoints ───────────────────────────────────────────────────────


@router.get("/me", response_model=ShiftListResponse)
def my_shifts(
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> ShiftListResponse:
    """My shifts in a date range. Defaults to today→+14d if not provided."""
    if date_from is None:
        date_from = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    if date_to is None:
        date_to = date_from + timedelta(days=14)

    shifts = db.scalars(
        select(Shift)
        .where(
            Shift.tenant_id == tenant_id,
            Shift.user_id == user.id,
            Shift.status.in_(_VISIBLE_STATUSES),
            Shift.starts_at >= date_from,
            Shift.starts_at < date_to,
        )
        .order_by(Shift.starts_at.asc())
    ).all()
    return ShiftListResponse(items=_hydrate_shifts(db, tenant_id, list(shifts)))


@router.get("/me/upcoming", response_model=ShiftListResponse)
def my_upcoming_shifts(
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=5, ge=1, le=20),
) -> ShiftListResponse:
    """My next N scheduled shifts from now onward."""
    now = datetime.now(UTC)
    shifts = db.scalars(
        select(Shift)
        .where(
            Shift.tenant_id == tenant_id,
            Shift.user_id == user.id,
            Shift.status.in_(_VISIBLE_STATUSES),
            Shift.ends_at > now,
        )
        .order_by(Shift.starts_at.asc())
        .limit(limit)
    ).all()
    return ShiftListResponse(items=_hydrate_shifts(db, tenant_id, list(shifts)))


@router.get("/restaurant/week", response_model=RestaurantWeekResponse)
def restaurant_week(
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    restaurant_id: UUID = Query(...),
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> RestaurantWeekResponse:
    """All shifts for a restaurant in a date range, grouped by employee.

    Any authenticated user in the tenant can call this — managers see all,
    employees see their team's week.
    """
    restaurant = db.scalar(
        select(Restaurant).where(
            Restaurant.id == restaurant_id,
            Restaurant.tenant_id == tenant_id,
            Restaurant.deleted_at.is_(None),
        )
    )
    if restaurant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    if date_from is None:
        # Monday of current week
        today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        date_from = today - timedelta(days=today.weekday())
    if date_to is None:
        date_to = date_from + timedelta(days=7)

    shifts = db.scalars(
        select(Shift)
        .where(
            Shift.tenant_id == tenant_id,
            Shift.restaurant_id == restaurant_id,
            Shift.status.in_(_VISIBLE_STATUSES),
            Shift.starts_at >= date_from,
            Shift.starts_at < date_to,
        )
        .order_by(Shift.starts_at.asc())
    ).all()

    hydrated = _hydrate_shifts(db, tenant_id, list(shifts))

    rows_by_user: dict[UUID, RestaurantWeekRow] = {}
    for shift_resp in hydrated:
        row = rows_by_user.get(shift_resp.user_id)
        if row is None:
            row = RestaurantWeekRow(
                user_id=shift_resp.user_id,
                full_name=shift_resp.user_full_name or "—",
                shifts=[],
            )
            rows_by_user[shift_resp.user_id] = row
        row.shifts.append(shift_resp)

    rows = sorted(rows_by_user.values(), key=lambda r: r.full_name.lower())

    return RestaurantWeekResponse(
        restaurant_id=restaurant.id,
        restaurant_name=restaurant.name,
        starts_at=date_from,
        ends_at=date_to,
        rows=rows,
    )


@router.post(
    "/publish",
    response_model=PublishScheduleResponse,
    dependencies=[Depends(require_manager)],
)
def publish_week_shifts(
    payload: PublishScheduleRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> PublishScheduleResponse:
    """Compatibility endpoint for publishing shifts from the shifts API."""
    return publish_schedule_for_week(
        week_start_raw=payload.week_start,
        current_user=user,
        db=db,
    )


@router.get("/{shift_id}", response_model=ShiftWithTeammates)
def shift_detail(
    shift_id: UUID,
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ShiftWithTeammates:
    """Detail of a shift plus teammates working at the same restaurant during it."""
    shift = _get_shift_or_404(db, tenant_id, shift_id)

    # Employees can only see their own shifts' detail.
    if user.role == "EMPLOYEE" and shift.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No autorizado")

    overlapping = db.scalars(
        select(Shift)
        .where(
            Shift.tenant_id == tenant_id,
            Shift.restaurant_id == shift.restaurant_id,
            Shift.id != shift.id,
            Shift.user_id != shift.user_id,
            Shift.status.in_(_VISIBLE_STATUSES),
            and_(Shift.starts_at < shift.ends_at, Shift.ends_at > shift.starts_at),
        )
        .order_by(Shift.starts_at.asc())
    ).all()

    user_ids = {s.user_id for s in overlapping}
    user_names: dict[UUID, tuple[str, str | None]] = {}
    if user_ids:
        for u in db.scalars(select(User).where(User.id.in_(user_ids))).all():
            user_names[u.id] = (u.full_name, None)

    teammates = [
        TeammateSummary(
            user_id=s.user_id,
            full_name=user_names.get(s.user_id, ("—", None))[0],
            role=s.role,
            starts_at=s.starts_at,
            ends_at=s.ends_at,
        )
        for s in overlapping
    ]

    duration = int((shift.ends_at - shift.starts_at).total_seconds() // 60)
    owner = db.get(User, shift.user_id)
    restaurant = db.get(Restaurant, shift.restaurant_id)
    return ShiftWithTeammates(
        id=shift.id,
        tenant_id=shift.tenant_id,
        restaurant_id=shift.restaurant_id,
        restaurant_name=restaurant.name if restaurant else None,
        user_id=shift.user_id,
        user_full_name=owner.full_name if owner else None,
        starts_at=shift.starts_at,
        ends_at=shift.ends_at,
        duration_minutes=duration,
        role=shift.role,
        notes=shift.notes,
        status=shift.status,
        created_at=shift.created_at,
        teammates=teammates,
    )


# ── Manager endpoints ────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=ShiftListResponse,
    dependencies=[Depends(require_manager)],
)
def list_shifts(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
    restaurant_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> ShiftListResponse:
    stmt = select(Shift).where(Shift.tenant_id == tenant_id)
    if restaurant_id is not None:
        stmt = stmt.where(Shift.restaurant_id == restaurant_id)
    if user_id is not None:
        stmt = stmt.where(Shift.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(Shift.starts_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Shift.starts_at < date_to)
    shifts = db.scalars(stmt.order_by(Shift.starts_at.asc()).limit(500)).all()
    return ShiftListResponse(items=_hydrate_shifts(db, tenant_id, list(shifts)))


@router.post(
    "",
    response_model=ShiftResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_manager)],
)
def create_shift(
    payload: ShiftCreateRequest,
    tenant_id: TenantId,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ShiftResponse:
    # Validate restaurant
    restaurant = db.scalar(
        select(Restaurant).where(
            Restaurant.id == payload.restaurant_id,
            Restaurant.tenant_id == tenant_id,
            Restaurant.deleted_at.is_(None),
        )
    )
    if restaurant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    # Validate target user
    target_user = db.scalar(
        select(User).where(
            User.id == payload.user_id,
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
        )
    )
    if target_user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    # Detect overlap for the same user
    overlap = db.scalar(
        select(Shift).where(
            Shift.tenant_id == tenant_id,
            Shift.user_id == payload.user_id,
            Shift.status.in_(_VISIBLE_STATUSES + [ShiftStatus.DRAFT.value]),
            and_(
                Shift.starts_at < payload.ends_at,
                Shift.ends_at > payload.starts_at,
            ),
        )
    )
    if overlap is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="El empleado ya tiene un turno que solapa con este",
        )

    shift = Shift(
        tenant_id=tenant_id,
        restaurant_id=payload.restaurant_id,
        user_id=payload.user_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        role=payload.role,
        notes=payload.notes,
        status=ShiftStatus.DRAFT.value,
        created_by=user.id,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return _to_response(
        shift, user_name=target_user.full_name, restaurant_name=restaurant.name
    )


@router.patch(
    "/{shift_id}",
    response_model=ShiftResponse,
    dependencies=[Depends(require_manager)],
)
def update_shift(
    shift_id: UUID,
    payload: ShiftUpdateRequest,
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
) -> ShiftResponse:
    shift = _get_shift_or_404(db, tenant_id, shift_id)

    new_starts = payload.starts_at if payload.starts_at is not None else shift.starts_at
    new_ends = payload.ends_at if payload.ends_at is not None else shift.ends_at
    if new_ends <= new_starts:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ends_at must be after starts_at",
        )

    if payload.starts_at is not None or payload.ends_at is not None:
        overlap = db.scalar(
            select(Shift).where(
                Shift.tenant_id == tenant_id,
                Shift.user_id == shift.user_id,
                Shift.id != shift.id,
                Shift.status.in_(_VISIBLE_STATUSES + [ShiftStatus.DRAFT.value]),
                and_(Shift.starts_at < new_ends, Shift.ends_at > new_starts),
            )
        )
        if overlap is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="El empleado ya tiene un turno que solapa con este",
            )

    if payload.starts_at is not None:
        shift.starts_at = payload.starts_at
    if payload.ends_at is not None:
        shift.ends_at = payload.ends_at
    if payload.role is not None:
        shift.role = payload.role
    if payload.notes is not None:
        shift.notes = payload.notes
    if payload.status is not None:
        shift.status = payload.status

    db.commit()
    db.refresh(shift)
    return _to_response(shift)


@router.delete(
    "/{shift_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_manager)],
)
def cancel_shift(
    shift_id: UUID,
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    shift = _get_shift_or_404(db, tenant_id, shift_id)
    shift.status = ShiftStatus.CANCELLED.value
    db.commit()
