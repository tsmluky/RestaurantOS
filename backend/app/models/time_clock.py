"""Time clock events (append-only) and derived work sessions."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.enums import SessionStatus


class TimeClockEvent(Base):
    """Append-only log of every clock-in / clock-out tap."""

    __tablename__ = "time_clock_events"
    __table_args__ = (
        Index("ix_tce_user_event_at", "user_id", "event_at"),
        Index("ix_tce_restaurant_event_at", "restaurant_id", "event_at"),
        Index("ix_tce_tenant_event_at", "tenant_id", "event_at"),
        Index(
            "uq_tce_idempotency",
            "tenant_id",
            "user_id",
            "idempotency_key",
            unique=True,
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    client_event_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    verification_method: Mapped[str] = mapped_column(String(20), nullable=False, default="NONE")
    verification_status: Mapped[str] = mapped_column(String(20), nullable=False, default="VERIFIED")
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    distance_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), nullable=False)
    work_session_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )


class WorkSession(Base, TimestampMixin):
    """Derived session — one row per worked shift."""

    __tablename__ = "work_sessions"
    __table_args__ = (
        Index("ix_ws_user_clock_in", "user_id", "clock_in_at"),
        Index(
            "uq_ws_open_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'OPEN'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    clock_in_event_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "time_clock_events.id",
            ondelete="RESTRICT",
            name="fk_work_sessions_clock_in_event_id",
            use_alter=True,
        ),
        nullable=False,
    )
    clock_out_event_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "time_clock_events.id",
            ondelete="RESTRICT",
            name="fk_work_sessions_clock_out_event_id",
            use_alter=True,
        ),
        nullable=True,
    )
    clock_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    clock_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SessionStatus.OPEN.value, index=True
    )
    was_corrected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    flagged_reasons: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(60)), nullable=True
    )
