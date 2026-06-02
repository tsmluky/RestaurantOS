"""Add shifts table for planned schedules (Module 1.5).

Revision ID: 0002_shifts
Revises: 0001_initial
Create Date: 2026-05-18
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_shifts"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shifts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="SCHEDULED"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["restaurant_id"], ["restaurants.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_shifts_ends_after_starts"),
    )
    op.create_index("ix_shifts_tenant_id", "shifts", ["tenant_id"])
    op.create_index("ix_shifts_restaurant_id", "shifts", ["restaurant_id"])
    op.create_index("ix_shifts_user_id", "shifts", ["user_id"])
    op.create_index("ix_shifts_status", "shifts", ["status"])
    op.create_index(
        "ix_shifts_user_starts_at", "shifts", ["tenant_id", "user_id", "starts_at"]
    )
    op.create_index(
        "ix_shifts_restaurant_starts_at",
        "shifts",
        ["tenant_id", "restaurant_id", "starts_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_shifts_restaurant_starts_at", table_name="shifts")
    op.drop_index("ix_shifts_user_starts_at", table_name="shifts")
    op.drop_index("ix_shifts_status", table_name="shifts")
    op.drop_index("ix_shifts_user_id", table_name="shifts")
    op.drop_index("ix_shifts_restaurant_id", table_name="shifts")
    op.drop_index("ix_shifts_tenant_id", table_name="shifts")
    op.drop_table("shifts")
