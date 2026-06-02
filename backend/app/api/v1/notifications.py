"""Push notification endpoints."""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_manager
from app.models.enums import ShiftStatus
from app.models.notification import DeviceToken
from app.models.shift import Shift
from app.models.user import User
from app.services.push import send_push

logger = logging.getLogger("restaurantos.notifications")
router = APIRouter()


class RegisterTokenRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=512, description="Expo push token")
    platform: str | None = Field(None, pattern="^(ios|android)$")


class RegisterTokenResponse(BaseModel):
    ok: bool


class PublishScheduleRequest(BaseModel):
    week_start: str = Field(
        ...,
        description="ISO date of Monday of the week, e.g. 2026-05-25",
    )


class PublishScheduleResponse(BaseModel):
    shifts_published: int
    notifications_sent: int


def publish_schedule_for_week(
    *,
    week_start_raw: str,
    current_user: User,
    db: Session,
) -> PublishScheduleResponse:
    """Mark draft shifts as published for a week and notify affected employees."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Publishing shifts requires a tenant context",
        )

    try:
        week_start = datetime.fromisoformat(week_start_raw).replace(tzinfo=UTC)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid week_start date: {week_start_raw}",
        ) from exc

    week_end = week_start + timedelta(days=7)
    draft_shifts = db.scalars(
        select(Shift).where(
            Shift.tenant_id == current_user.tenant_id,
            Shift.starts_at >= week_start,
            Shift.starts_at < week_end,
            Shift.status == ShiftStatus.DRAFT.value,
        )
    ).all()

    if not draft_shifts:
        return PublishScheduleResponse(shifts_published=0, notifications_sent=0)

    affected_user_ids: set[UUID] = set()
    for shift in draft_shifts:
        shift.status = ShiftStatus.PUBLISHED.value
        db.add(shift)
        affected_user_ids.add(shift.user_id)

    db.commit()

    week_label = week_start.strftime("del %d/%m")
    notifications_sent = send_push(
        db,
        user_ids=list(affected_user_ids),
        title="Nuevo horario disponible",
        body=f"Tu horario de la semana {week_label} ya esta listo. Echale un ojo.",
        data={"type": "schedule_published", "week_start": week_start_raw},
    )

    logger.info(
        "Published %d shifts for week %s, notified %d device(s)",
        len(draft_shifts),
        week_start_raw,
        notifications_sent,
    )

    return PublishScheduleResponse(
        shifts_published=len(draft_shifts),
        notifications_sent=notifications_sent,
    )


@router.post(
    "/register-token",
    response_model=RegisterTokenResponse,
    summary="Register Expo push token for the current device",
)
def register_token(
    payload: RegisterTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RegisterTokenResponse:
    """Called by the mobile app after obtaining an ExpoPushToken."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Push tokens require a tenant user",
        )

    existing = db.scalars(
        select(DeviceToken).where(DeviceToken.token == payload.token)
    ).first()

    now = datetime.now(UTC)
    if existing:
        existing.user_id = current_user.id
        existing.tenant_id = current_user.tenant_id
        existing.platform = payload.platform or existing.platform
        existing.last_used_at = now
        db.add(existing)
    else:
        db.add(
            DeviceToken(
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
                token=payload.token,
                platform=payload.platform,
                last_used_at=now,
            )
        )

    db.commit()
    logger.info(
        "Device token registered for user %s (platform=%s)",
        current_user.id,
        payload.platform,
    )
    return RegisterTokenResponse(ok=True)


@router.delete(
    "/unregister-token",
    response_model=RegisterTokenResponse,
    summary="Unregister push token on logout",
)
def unregister_token(
    payload: RegisterTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RegisterTokenResponse:
    """Remove the device token on logout so the device stops receiving pushes."""
    existing = db.scalars(
        select(DeviceToken).where(
            DeviceToken.token == payload.token,
            DeviceToken.user_id == current_user.id,
        )
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    return RegisterTokenResponse(ok=True)


@router.post(
    "/publish-schedule",
    response_model=PublishScheduleResponse,
    summary="Publish weekly schedule and notify affected employees",
    dependencies=[Depends(require_manager)],
)
def publish_schedule(
    payload: PublishScheduleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PublishScheduleResponse:
    """Publish a week of draft shifts and send schedule notifications."""
    return publish_schedule_for_week(
        week_start_raw=payload.week_start,
        current_user=current_user,
        db=db,
    )
