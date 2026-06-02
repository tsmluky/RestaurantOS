"""Background jobs that run independently of HTTP requests."""
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.audit import AuditLog
from app.models.enums import SessionStatus, ShiftStatus
from app.models.restaurant import Restaurant
from app.models.shift import Shift
from app.models.tenant import Tenant
from app.models.time_clock import WorkSession
from app.models.user import User

logger = logging.getLogger("restaurantos.jobs")

CHECKOUT_REMINDER_GRACE_MINUTES = 30
CHECKOUT_REMINDER_LOOKBACK_HOURS = 4


def flag_stale_sessions() -> None:
    """Mark OPEN sessions that exceed max_session_hours as NEEDS_REVIEW."""
    db = SessionLocal()
    try:
        now = datetime.now(UTC)
        open_sessions = db.scalars(
            select(WorkSession).where(WorkSession.status == SessionStatus.OPEN.value)
        ).all()

        flagged = 0
        for session in open_sessions:
            restaurant = db.get(Restaurant, session.restaurant_id)
            if restaurant is None:
                continue

            elapsed_hours = (now - session.clock_in_at).total_seconds() / 3600
            if elapsed_hours <= restaurant.max_session_hours:
                continue

            existing = list(session.flagged_reasons or [])
            if "max_session_exceeded" in existing:
                continue

            session.status = SessionStatus.NEEDS_REVIEW.value
            session.flagged_reasons = [*existing, "max_session_exceeded"]
            db.add(
                AuditLog(
                    tenant_id=session.tenant_id,
                    action="session.auto_flagged",
                    target_type="work_session",
                    target_id=session.id,
                    payload={
                        "reason": "max_session_exceeded",
                        "elapsed_hours": round(elapsed_hours, 1),
                        "max_session_hours": restaurant.max_session_hours,
                    },
                )
            )
            flagged += 1

        if flagged:
            db.commit()
            logger.info("Auto-flagged %d stale session(s) as NEEDS_REVIEW", flagged)
    except Exception:
        logger.exception("Error in flag_stale_sessions job")
        db.rollback()
    finally:
        db.close()


def process_checkout_reminders(
    db: Session,
    *,
    now: datetime | None = None,
    send_push_func: Callable[..., int] | None = None,
) -> int:
    """Send checkout reminders for ended shifts that still have an open session."""
    if now is None:
        now = datetime.now(UTC)
    if send_push_func is None:
        from app.services.push import send_push as send_push_func

    ended_shifts = db.scalars(
        select(Shift).where(
            Shift.ends_at <= now,
            Shift.ends_at >= now - timedelta(hours=CHECKOUT_REMINDER_LOOKBACK_HOURS),
            Shift.status == ShiftStatus.PUBLISHED.value,
            Shift.checkout_reminder_sent_at.is_(None),
        )
    ).all()

    reminded = 0
    for shift in ended_shifts:
        tenant = db.get(Tenant, shift.tenant_id)
        grace_minutes = (
            tenant.checkout_reminder_grace_minutes
            if tenant and tenant.checkout_reminder_grace_minutes is not None
            else CHECKOUT_REMINDER_GRACE_MINUTES
        )
        if shift.ends_at > now - timedelta(minutes=grace_minutes):
            continue

        open_session = db.scalars(
            select(WorkSession).where(
                WorkSession.user_id == shift.user_id,
                WorkSession.tenant_id == shift.tenant_id,
                WorkSession.status == SessionStatus.OPEN.value,
            )
        ).first()
        if open_session is None:
            continue

        user = db.get(User, shift.user_id)
        first_name = user.full_name.split()[0] if user and user.full_name else "Hola"
        minutes_late = int((now - shift.ends_at).total_seconds() / 60)
        sent = send_push_func(
            db,
            user_ids=[shift.user_id],
            title="Fichar salida pendiente",
            body=(
                f"{first_name}, tu turno termino hace {minutes_late} min. "
                "Recuerda cerrar tu jornada en la app."
            ),
            data={"type": "checkout_reminder", "shift_id": str(shift.id)},
        )

        if sent > 0:
            shift.checkout_reminder_sent_at = now
            db.add(shift)
            reminded += 1

    if reminded:
        db.commit()
    return reminded


def remind_checkout() -> None:
    """Send push to employees who did not clock out after their shift ended."""
    db = SessionLocal()
    try:
        reminded = process_checkout_reminders(db)
        if reminded:
            logger.info("Checkout reminder sent to %d employee(s)", reminded)
    except Exception:
        logger.exception("Error in remind_checkout job")
        db.rollback()
    finally:
        db.close()


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")

    scheduler.add_job(
        flag_stale_sessions,
        trigger="interval",
        minutes=30,
        id="flag_stale_sessions",
        replace_existing=True,
    )
    scheduler.add_job(
        remind_checkout,
        trigger="interval",
        minutes=15,
        id="remind_checkout",
        replace_existing=True,
    )

    return scheduler
