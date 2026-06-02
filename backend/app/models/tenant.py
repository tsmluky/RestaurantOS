"""Tenant model: top-level entity for multi-tenancy."""
from uuid import UUID, uuid4

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import TenantStatus


class Tenant(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tenants"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TenantStatus.ACTIVE.value, index=True
    )
    plan_code: Mapped[str] = mapped_column(String(30), nullable=False, default="starter")
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(60), nullable=True, unique=True
    )
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, default="Europe/Madrid")
    checkout_reminder_grace_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.slug} ({self.status})>"
