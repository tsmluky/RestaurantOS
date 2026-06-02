"""Push notification registration and schedule publication."""
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.jobs import process_checkout_reminders
from app.core.security import TokenType, create_token, hash_password
from app.models import (
    DeviceToken,
    Restaurant,
    Shift,
    Tenant,
    TimeClockEvent,
    User,
    WorkSession,
)
from app.models.enums import (
    ClockEventSource,
    ClockEventType,
    SessionStatus,
    ShiftStatus,
    UserRole,
    UserStatus,
    VerificationMethod,
    VerificationStatus,
)


def _access_token(user) -> str:
    return create_token(
        subject=user.id,
        token_type=TokenType.ACCESS,
        tenant_id=user.tenant_id,
        role=user.role,
    )


def _seed_users(db_session):
    tenant = Tenant(name="Notifications", slug="notifications", timezone="Europe/Madrid")
    db_session.add(tenant)
    db_session.flush()

    manager = User(
        tenant_id=tenant.id,
        email="manager-notifications@example.com",
        full_name="Manager Notifications",
        password_hash=hash_password("test-password-123"),
        role=UserRole.MANAGER.value,
        status=UserStatus.ACTIVE.value,
    )
    employee = User(
        tenant_id=tenant.id,
        email="employee-notifications@example.com",
        full_name="Employee Notifications",
        password_hash=hash_password("test-password-123"),
        role=UserRole.EMPLOYEE.value,
        status=UserStatus.ACTIVE.value,
    )
    db_session.add_all([manager, employee])
    db_session.commit()
    return tenant, manager, employee


def test_register_token_upserts_current_device(client, db_session):
    _tenant, _manager, employee = _seed_users(db_session)
    token = _access_token(employee)

    response = client.post(
        "/api/v1/notifications/register-token",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "ExponentPushToken[test-device]", "platform": "ios"},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}

    response = client.post(
        "/api/v1/notifications/register-token",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "ExponentPushToken[test-device]", "platform": "android"},
    )

    assert response.status_code == 200
    stored = db_session.scalars(select(DeviceToken)).all()
    assert len(stored) == 1
    assert stored[0].user_id == employee.id
    assert stored[0].platform == "android"


def test_publish_week_marks_drafts_and_sends_one_push(
    client,
    db_session,
    monkeypatch,
):
    tenant, manager, employee = _seed_users(db_session)
    restaurant = Restaurant(
        tenant_id=tenant.id,
        name="Sucursal Notifications",
        timezone="Europe/Madrid",
        geofence_radius_m=100,
        late_tolerance_min=10,
        max_session_hours=14,
    )
    db_session.add(restaurant)
    db_session.flush()

    week_start = datetime(2026, 5, 25, tzinfo=UTC)
    draft_shift = Shift(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        starts_at=week_start + timedelta(hours=9),
        ends_at=week_start + timedelta(hours=17),
        role="Sala",
        status=ShiftStatus.DRAFT.value,
        created_by=manager.id,
    )
    already_published = Shift(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        starts_at=week_start + timedelta(days=1, hours=9),
        ends_at=week_start + timedelta(days=1, hours=17),
        role="Sala",
        status=ShiftStatus.PUBLISHED.value,
        created_by=manager.id,
    )
    db_session.add_all([draft_shift, already_published])
    db_session.commit()

    sent_payloads = []

    def fake_send_push(db, *, user_ids, title, body, data=None):
        sent_payloads.append(
            {"user_ids": user_ids, "title": title, "body": body, "data": data}
        )
        return len(user_ids)

    monkeypatch.setattr("app.api.v1.notifications.send_push", fake_send_push)

    response = client.post(
        "/api/v1/shifts/publish",
        headers={"Authorization": f"Bearer {_access_token(manager)}"},
        json={"week_start": "2026-05-25"},
    )

    assert response.status_code == 200
    assert response.json() == {"shifts_published": 1, "notifications_sent": 1}

    db_session.refresh(draft_shift)
    db_session.refresh(already_published)
    assert draft_shift.status == ShiftStatus.PUBLISHED.value
    assert already_published.status == ShiftStatus.PUBLISHED.value
    assert sent_payloads == [
        {
            "user_ids": [employee.id],
            "title": "Nuevo horario disponible",
            "body": "Tu horario de la semana del 25/05 ya esta listo. Echale un ojo.",
            "data": {"type": "schedule_published", "week_start": "2026-05-25"},
        }
    ]


def test_checkout_reminder_sends_once_after_tenant_grace(db_session):
    tenant, manager, employee = _seed_users(db_session)
    tenant.checkout_reminder_grace_minutes = 20
    restaurant = Restaurant(
        tenant_id=tenant.id,
        name="Sucursal Checkout",
        timezone="Europe/Madrid",
        geofence_radius_m=100,
        late_tolerance_min=10,
        max_session_hours=14,
    )
    db_session.add(restaurant)
    db_session.flush()

    now = datetime(2026, 5, 25, 18, 0, tzinfo=UTC)
    shift = Shift(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        starts_at=now - timedelta(hours=5),
        ends_at=now - timedelta(minutes=25),
        role="Sala",
        status=ShiftStatus.PUBLISHED.value,
        created_by=manager.id,
    )
    clock_in_event = TimeClockEvent(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        event_type=ClockEventType.CLOCK_IN.value,
        event_at=shift.starts_at,
        source=ClockEventSource.MOBILE_APP.value,
        verification_method=VerificationMethod.GPS.value,
        verification_status=VerificationStatus.VERIFIED.value,
        idempotency_key="checkout-reminder-clock-in",
    )
    db_session.add_all([shift, clock_in_event])
    db_session.flush()
    session = WorkSession(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        clock_in_event_id=clock_in_event.id,
        clock_in_at=shift.starts_at,
        status=SessionStatus.OPEN.value,
    )
    db_session.add(session)
    db_session.flush()
    clock_in_event.work_session_id = session.id
    db_session.commit()

    sent_payloads = []

    def fake_send_push(db, *, user_ids, title, body, data=None):
        sent_payloads.append(
            {"user_ids": user_ids, "title": title, "body": body, "data": data}
        )
        return len(user_ids)

    assert process_checkout_reminders(
        db_session,
        now=now,
        send_push_func=fake_send_push,
    ) == 1

    db_session.refresh(shift)
    assert shift.checkout_reminder_sent_at == now
    assert sent_payloads == [
        {
            "user_ids": [employee.id],
            "title": "Fichar salida pendiente",
            "body": (
                "Employee, tu turno termino hace 25 min. "
                "Recuerda cerrar tu jornada en la app."
            ),
            "data": {"type": "checkout_reminder", "shift_id": str(shift.id)},
        }
    ]

    assert process_checkout_reminders(
        db_session,
        now=now + timedelta(minutes=15),
        send_push_func=fake_send_push,
    ) == 0
    assert len(sent_payloads) == 1
