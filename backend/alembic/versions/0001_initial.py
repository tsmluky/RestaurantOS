"""Initial RestaurantOS schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-17
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("plan_code", sa.String(length=30), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=60), nullable=True),
        sa.Column("timezone", sa.String(length=60), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("slug"),
        sa.UniqueConstraint("stripe_customer_id"),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])
    op.create_index("ix_tenants_status", "tenants", ["status"])
    op.create_index("ix_tenants_deleted_at", "tenants", ["deleted_at"])

    op.create_table(
        "restaurants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("timezone", sa.String(length=60), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("geofence_radius_m", sa.Integer(), nullable=False),
        sa.Column("late_tolerance_min", sa.Integer(), nullable=False),
        sa.Column("max_session_hours", sa.Integer(), nullable=False),
        sa.Column("open_time", sa.Time(), nullable=True),
        sa.Column("close_time", sa.Time(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_restaurants_tenant_name"),
    )
    op.create_index("ix_restaurants_tenant_id", "restaurants", ["tenant_id"])
    op.create_index("ix_restaurants_deleted_at", "restaurants", ["deleted_at"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("pin_hash", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_full_name", "users", ["full_name"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_status", "users", ["status"])
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])
    op.create_index("ix_users_tenant_role_status", "users", ["tenant_id", "role", "status"])

    op.create_table(
        "employee_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("primary_restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("employee_code", sa.String(length=30), nullable=True),
        sa.Column("hourly_rate_cents", sa.Integer(), nullable=True),
        sa.Column("contract_hours_week", sa.Integer(), nullable=True),
        sa.Column("hired_at", sa.Date(), nullable=True),
        sa.Column("terminated_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["primary_restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_employee_profiles_tenant_id", "employee_profiles", ["tenant_id"])
    op.create_index(
        "ix_employee_profiles_primary_restaurant_id",
        "employee_profiles",
        ["primary_restaurant_id"],
    )
    op.create_index("ix_employee_profiles_employee_code", "employee_profiles", ["employee_code"])

    op.create_table(
        "work_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clock_in_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clock_out_event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("clock_in_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("clock_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("was_corrected", sa.Boolean(), nullable=False),
        sa.Column("flagged_reasons", postgresql.ARRAY(sa.String(length=60)), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_work_sessions_tenant_id", "work_sessions", ["tenant_id"])
    op.create_index("ix_work_sessions_restaurant_id", "work_sessions", ["restaurant_id"])
    op.create_index("ix_work_sessions_status", "work_sessions", ["status"])
    op.create_index("ix_ws_user_clock_in", "work_sessions", ["user_id", "clock_in_at"])
    op.create_index(
        "uq_ws_open_per_user",
        "work_sessions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'OPEN'"),
    )

    op.create_table(
        "time_clock_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("client_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("verification_method", sa.String(length=20), nullable=False),
        sa.Column("verification_status", sa.String(length=20), nullable=False),
        sa.Column("device_id", sa.String(length=120), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("distance_m", sa.Integer(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False),
        sa.Column("work_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["work_session_id"], ["work_sessions.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_time_clock_events_tenant_id", "time_clock_events", ["tenant_id"])
    op.create_index("ix_time_clock_events_device_id", "time_clock_events", ["device_id"])
    op.create_index("ix_time_clock_events_work_session_id", "time_clock_events", ["work_session_id"])
    op.create_index("ix_tce_user_event_at", "time_clock_events", ["user_id", "event_at"])
    op.create_index("ix_tce_restaurant_event_at", "time_clock_events", ["restaurant_id", "event_at"])
    op.create_index("ix_tce_tenant_event_at", "time_clock_events", ["tenant_id", "event_at"])
    op.create_index(
        "uq_tce_idempotency",
        "time_clock_events",
        ["tenant_id", "user_id", "idempotency_key"],
        unique=True,
    )

    op.create_foreign_key(
        "fk_work_sessions_clock_in_event_id",
        "work_sessions",
        "time_clock_events",
        ["clock_in_event_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_work_sessions_clock_out_event_id",
        "work_sessions",
        "time_clock_events",
        ["clock_out_event_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_table(
        "clock_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("affected_date", sa.Date(), nullable=False),
        sa.Column("suggested_clock_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suggested_clock_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("resolved_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("related_work_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["related_work_session_id"], ["work_sessions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_clock_incidents_tenant_id", "clock_incidents", ["tenant_id"])
    op.create_index("ix_clock_incidents_user_id", "clock_incidents", ["user_id"])
    op.create_index("ix_clock_incidents_affected_date", "clock_incidents", ["affected_date"])
    op.create_index("ix_clock_incidents_status", "clock_incidents", ["status"])

    op.create_table(
        "clock_corrections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("work_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("corrected_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("previous_clock_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("previous_clock_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("new_clock_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("new_clock_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["corrected_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["incident_id"], ["clock_incidents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["work_session_id"], ["work_sessions.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_clock_corrections_tenant_id", "clock_corrections", ["tenant_id"])
    op.create_index("ix_clock_corrections_work_session_id", "clock_corrections", ["work_session_id"])

    op.create_table(
        "export_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("format", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_export_batches_tenant_id", "export_batches", ["tenant_id"])
    op.create_index("ix_export_batches_status", "export_batches", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("target_type", sa.String(length=60), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_logs_tenant_id", "audit_logs", ["tenant_id"])
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_target_id", "audit_logs", ["target_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_tenant_created", "audit_logs", ["tenant_id", "created_at"])
    op.create_index("ix_audit_action_created", "audit_logs", ["action", "created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("export_batches")
    op.drop_table("clock_corrections")
    op.drop_table("clock_incidents")
    op.drop_constraint("fk_work_sessions_clock_out_event_id", "work_sessions", type_="foreignkey")
    op.drop_constraint("fk_work_sessions_clock_in_event_id", "work_sessions", type_="foreignkey")
    op.drop_table("time_clock_events")
    op.drop_table("work_sessions")
    op.drop_table("employee_profiles")
    op.drop_table("users")
    op.drop_table("restaurants")
    op.drop_table("tenants")
