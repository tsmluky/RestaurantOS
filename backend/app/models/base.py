"""Base classes and mixins for SQLAlchemy models."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Common declarative base."""


class TimestampMixin:
    """Adds created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    """Adds deleted_at column for soft-delete semantics."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )


class TenantScopedMixin:
    """All operational tables MUST inherit this.

    Forces tenant_id presence so middleware / repository helpers can enforce isolation.
    """

    @classmethod
    def _tenant_fk(cls) -> Mapped[UUID]:
        return mapped_column(
            PGUUID(as_uuid=True),
            ForeignKey("tenants.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )


def uuid_pk() -> Mapped[UUID]:
    """Returns a Mapped UUID PK column with default uuid4()."""
    return mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
