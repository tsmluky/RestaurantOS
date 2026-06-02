"""Manager correction behavior."""
from datetime import UTC, date, datetime, timedelta

from app.core.security import TokenType, create_token, hash_password
from app.models import (
    ClockIncident,
    EmployeeProfile,
    Restaurant,
    Tenant,
    TimeClockEvent,
    User,
    WorkSession,
)
from app.models.enums import (
    ClockEventSource,
    ClockEventType,
    IncidentStatus,
    IncidentType,
    SessionStatus,
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


def _seed_open_session(db_session):
    tenant = Tenant(name="Corrections", slug="corrections", timezone="Europe/Madrid")
    db_session.add(tenant)
    db_session.flush()

    restaurant = Restaurant(
        tenant_id=tenant.id,
        name="Sucursal Centro",
        timezone="Europe/Madrid",
        geofence_radius_m=100,
        late_tolerance_min=10,
        max_session_hours=14,
    )
    manager = User(
        tenant_id=tenant.id,
        email="manager-corrections@example.com",
        full_name="Manager Corrections",
        password_hash=hash_password("test-password-123"),
        role=UserRole.MANAGER.value,
        status=UserStatus.ACTIVE.value,
    )
    employee = User(
        tenant_id=tenant.id,
        email="employee-corrections@example.com",
        full_name="Employee Corrections",
        password_hash=hash_password("test-password-123"),
        role=UserRole.EMPLOYEE.value,
        status=UserStatus.ACTIVE.value,
    )
    db_session.add_all([restaurant, manager, employee])
    db_session.flush()
    db_session.add(
        EmployeeProfile(
            tenant_id=tenant.id,
            user_id=employee.id,
            primary_restaurant_id=restaurant.id,
        )
    )

    clock_in_at = datetime(2026, 5, 17, 12, 0, tzinfo=UTC)
    event = TimeClockEvent(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        event_type=ClockEventType.CLOCK_IN.value,
        event_at=clock_in_at,
        source=ClockEventSource.MOBILE_APP.value,
        verification_method=VerificationMethod.GPS.value,
        verification_status=VerificationStatus.VERIFIED.value,
        idempotency_key=f"test-correction-{tenant.slug}",
    )
    db_session.add(event)
    db_session.flush()

    session = WorkSession(
        tenant_id=tenant.id,
        restaurant_id=restaurant.id,
        user_id=employee.id,
        clock_in_event_id=event.id,
        clock_in_at=clock_in_at,
        status=SessionStatus.OPEN.value,
    )
    db_session.add(session)
    db_session.flush()
    event.work_session_id = session.id
    db_session.commit()
    return manager, session


def test_manager_can_correct_open_session(client, db_session, monkeypatch):
    manager, session = _seed_open_session(db_session)
    token = _access_token(manager)
    new_out = session.clock_in_at + timedelta(hours=4, minutes=15)
    sent_payloads = []

    def fake_send_push(db, *, user_ids, title, body, data=None):
        sent_payloads.append(
            {"user_ids": user_ids, "title": title, "body": body, "data": data}
        )
        return len(user_ids)

    monkeypatch.setattr("app.api.v1.manager.send_push", fake_send_push)

    response = client.post(
        "/api/v1/manager/clock-corrections",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "work_session_id": str(session.id),
            "new_clock_out_at": new_out.isoformat(),
            "reason": "Empleado olvidó fichar salida",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["work_session"]["status"] == "CORRECTED"
    assert body["work_session"]["duration_minutes"] == 255
    assert body["work_session"]["was_corrected"] is True
    assert sent_payloads == [
        {
            "user_ids": [session.user_id],
            "title": "Correccion aprobada",
            "body": "Tu solicitud de correccion de fichaje ha sido aprobada.",
            "data": {
                "type": "correction_approved",
                "target_id": body["correction_id"],
            },
        }
    ]


def test_correction_rejects_out_before_in(client, db_session):
    manager, session = _seed_open_session(db_session)
    token = _access_token(manager)
    bad_out = session.clock_in_at - timedelta(minutes=1)

    response = client.post(
        "/api/v1/manager/clock-corrections",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "work_session_id": str(session.id),
            "new_clock_out_at": bad_out.isoformat(),
            "reason": "Salida inválida",
        },
    )

    assert response.status_code == 422


def test_rejected_incident_notifies_employee(client, db_session, monkeypatch):
    manager, session = _seed_open_session(db_session)
    incident = ClockIncident(
        tenant_id=session.tenant_id,
        user_id=session.user_id,
        restaurant_id=session.restaurant_id,
        type=IncidentType.FORGOT_CLOCK_OUT.value,
        affected_date=date(2026, 5, 17),
        related_work_session_id=session.id,
        description="Olvide fichar salida",
        status=IncidentStatus.PENDING.value,
    )
    db_session.add(incident)
    db_session.commit()

    sent_payloads = []

    def fake_send_push(db, *, user_ids, title, body, data=None):
        sent_payloads.append(
            {"user_ids": user_ids, "title": title, "body": body, "data": data}
        )
        return len(user_ids)

    monkeypatch.setattr("app.api.v1.manager.send_push", fake_send_push)

    response = client.patch(
        f"/api/v1/manager/incidents/{incident.id}",
        headers={"Authorization": f"Bearer {_access_token(manager)}"},
        json={"status": "REJECTED", "resolution_note": "No procede"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"
    assert sent_payloads == [
        {
            "user_ids": [session.user_id],
            "title": "Correccion rechazada",
            "body": "Tu solicitud de correccion de fichaje ha sido rechazada.",
            "data": {
                "type": "correction_rejected",
                "target_id": str(incident.id),
            },
        }
    ]
