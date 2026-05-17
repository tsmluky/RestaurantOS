"""Restaurant / location model."""
from datetime import time
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Restaurant(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "restaurants"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_restaurants_tenant_name"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, default="Europe/Madrid")
    late_tolerance_min: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_session_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=14)
    open_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    def __repr__(self) -> str:
        return f"<Restaurant {self.name}>"
