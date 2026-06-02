"""Planned shifts — what the manager schedules for each employee.

These are distinct from `work_sessions` (which are derived from actual clock events).
A `Shift` says "Maria should work Wed 12:00-16:00 at Paffuto Aragón".
A `WorkSession` says "Maria actually clocked in at 12:03 and out at 15:58".

Linking shifts ↔ work_sessions for compliance/late-detection is a follow-up.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.enums import ShiftStatus


class Shift(Base, TimestampMixin):
    """A planned shift for an employee at a given restaurant."""

    __tablename__ = "shifts"
    __table_args__ = (
        Index("ix_shifts_user_starts_at", "tenant_id", "user_id", "starts_at"),
        Index(
            "ix_shifts_restaurant_starts_at", "tenant_id", "restaurant_id", "starts_at"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
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
        index=True,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    checkout_reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ShiftStatus.SCHEDULED.value, index=True
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<Shift {self.user_id} {self.starts_at:%Y-%m-%d %H:%M}>"
