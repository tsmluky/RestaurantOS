"""Background jobs — scheduled tasks that run independently of HTTP requests."""
import logging
from datetime import UTC, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.audit import AuditLog
from app.models.enums import SessionStatus
from app.models.restaurant import Restaurant
from app.models.time_clock import WorkSession

logger = logging.getLogger("restaurantos.jobs")


def flag_stale_sessions() -> None:
    """Mark OPEN sessions that exceed the restaurant's max_session_hours as NEEDS_REVIEW.

    Business rule #3 from the spec: job runs every 30 min, flags sessions where
    the employee has been clocked in longer than max_session_hours without a clock-out.
    """
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


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        flag_stale_sessions,
        trigger="interval",
        minutes=30,
        id="flag_stale_sessions",
        replace_existing=True,
        misfire_grace_time=120,
    )
    return scheduler
