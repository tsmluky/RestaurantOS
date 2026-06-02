"""Add DRAFT and PUBLISHED to shift status; extend column to 20 chars.

The column was already VARCHAR(20) with server_default='SCHEDULED'.
We change the default to 'DRAFT' so new shifts start as drafts until
the manager explicitly publishes the week.

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change server default: new shifts are DRAFT until published
    op.alter_column(
        "shifts",
        "status",
        server_default="DRAFT",
        existing_type=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "shifts",
        "status",
        server_default="SCHEDULED",
        existing_type=sa.String(length=20),
        existing_nullable=False,
    )
