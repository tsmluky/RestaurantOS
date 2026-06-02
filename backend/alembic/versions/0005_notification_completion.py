"""Complete sprint 1 notification state.

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-21
"""
import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tenants",
        sa.Column(
            "checkout_reminder_grace_minutes",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),
    )
    op.add_column(
        "shifts",
        sa.Column("checkout_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("tenants", "checkout_reminder_grace_minutes", server_default=None)


def downgrade() -> None:
    op.drop_column("shifts", "checkout_reminder_sent_at")
    op.drop_column("tenants", "checkout_reminder_grace_minutes")
