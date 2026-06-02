"""Create a demo tenant + manager + a few employees for local development.

Run from the repo root:
    python scripts/seed_demo.py
"""
from __future__ import annotations

import sys
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# Make `app` importable when running from repo root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import TokenType, create_token, hash_password, hash_pin  # noqa: E402
from app.models import Restaurant, Shift, Tenant, User  # noqa: E402
from app.models.employee import EmployeeProfile  # noqa: E402
from app.models.enums import ShiftStatus, UserRole, UserStatus  # noqa: E402


def _employee_password() -> str:
    return "demo-employee"


DEMO_EMPLOYEES = [
    ("María García", "maria.garcia@demo.dev", "1001"),
    ("Cristian Pérez", "cristian.perez@demo.dev", "1002"),
    ("Rocío Sánchez", "rocio.sanchez@demo.dev", "1003"),
    ("Francisco Iannicelli", "francisco.iannicelli@demo.dev", "1004"),
    ("Joana Liberti", "joana.liberti@demo.dev", "1005"),
]

MADRID = ZoneInfo("Europe/Madrid")
LUNCH = (time(12, 0), time(16, 0))
DINNER = (time(20, 0), time(0, 0))  # 00:00 next day

# Weekday index: 0=Mon ... 6=Sun
# Value: (lunch?, dinner?)
SHIFT_PATTERN: dict[str, dict[int, tuple[bool, bool]]] = {
    "maria.garcia@demo.dev": {
        0: (True, False), 1: (True, False), 2: (True, True),
        3: (True, False), 4: (True, True), 5: (False, True),
    },
    "cristian.perez@demo.dev": {
        2: (True, True), 3: (True, True), 4: (True, True),
        5: (True, True), 6: (True, False),
    },
    "rocio.sanchez@demo.dev": {
        1: (True, False), 4: (False, True),
        5: (True, True), 6: (True, False),
    },
    "francisco.iannicelli@demo.dev": {
        2: (True, True), 3: (True, True), 4: (True, True),
        5: (True, True), 6: (True, True),
    },
    "joana.liberti@demo.dev": {
        0: (True, True), 4: (True, True),
        5: (True, True), 6: (True, True),
    },
}

EMPLOYEE_ROLE = {
    "maria.garcia@demo.dev": "Sala",
    "cristian.perez@demo.dev": "Cocina",
    "rocio.sanchez@demo.dev": "Sala",
    "francisco.iannicelli@demo.dev": "Cocina",
    "joana.liberti@demo.dev": "Barra",
}


def _make_shift(
    *,
    tenant_id,
    restaurant_id,
    user_id,
    day: datetime,
    span: tuple[time, time],
    role: str,
    created_by,
) -> Shift:
    """Build a Shift row from a Madrid-local day + time span."""
    start_local = datetime.combine(day.date(), span[0], tzinfo=MADRID)
    if span[1] == time(0, 0):
        # Wraps to next day midnight
        end_local = datetime.combine(day.date() + timedelta(days=1), time(0, 0), tzinfo=MADRID)
    else:
        end_local = datetime.combine(day.date(), span[1], tzinfo=MADRID)
    return Shift(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        user_id=user_id,
        starts_at=start_local.astimezone(UTC),
        ends_at=end_local.astimezone(UTC),
        role=role,
        status=ShiftStatus.PUBLISHED.value,
        created_by=created_by,
    )


def seed_shifts(db, tenant_id, restaurant_id, manager_id, employees_by_email) -> int:
    """Seed 2 weeks of shifts starting Monday of current week. Returns count created."""
    # Skip if there are already future shifts for this restaurant
    today_utc = datetime.now(UTC)
    already = db.scalar(
        select(Shift).where(
            Shift.tenant_id == tenant_id,
            Shift.restaurant_id == restaurant_id,
            Shift.starts_at >= today_utc - timedelta(days=2),
        )
    )
    if already is not None:
        return 0

    today_local = datetime.now(MADRID)
    week_start = (today_local - timedelta(days=today_local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    created = 0
    for offset in range(14):
        day = week_start + timedelta(days=offset)
        weekday = day.weekday()
        for email, pattern in SHIFT_PATTERN.items():
            user = employees_by_email.get(email)
            if user is None:
                continue
            has_lunch, has_dinner = pattern.get(weekday, (False, False))
            role = EMPLOYEE_ROLE.get(email, "Sala")
            if has_lunch:
                db.add(_make_shift(
                    tenant_id=tenant_id,
                    restaurant_id=restaurant_id,
                    user_id=user.id,
                    day=day,
                    span=LUNCH,
                    role=role,
                    created_by=manager_id,
                ))
                created += 1
            if has_dinner:
                db.add(_make_shift(
                    tenant_id=tenant_id,
                    restaurant_id=restaurant_id,
                    user_id=user.id,
                    day=day,
                    span=DINNER,
                    role=role,
                    created_by=manager_id,
                ))
                created += 1
    return created


def main() -> None:
    db = SessionLocal()
    try:
        # Superadmin (single global user, tenant_id NULL)
        superadmin = db.scalars(
            select(User).where(User.email == "admin@studio32.dev")
        ).first()
        if superadmin is None:
            superadmin = User(
                tenant_id=None,
                email="admin@studio32.dev",
                full_name="Studio32 Admin",
                password_hash=hash_password("studio32-admin"),
                role=UserRole.SUPERADMIN.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(superadmin)
            db.flush()
            print("  superadmin: admin@studio32.dev / studio32-admin")

        # Demo tenant
        existing = db.scalars(select(Tenant).where(Tenant.slug == "demo")).first()
        if existing is not None:
            print(f"  tenant 'demo' ya existe: {existing.id}")
            employees = db.scalars(
                select(User).where(
                    User.tenant_id == existing.id,
                    User.role == UserRole.EMPLOYEE.value,
                )
            ).all()
            pin_by_email = {email: pin for _name, email, pin in DEMO_EMPLOYEES}
            pin_by_name = {name: pin for name, _email, pin in DEMO_EMPLOYEES}
            for employee in employees:
                pin = pin_by_email.get(employee.email or "") or pin_by_name.get(employee.full_name)
                if pin is not None and employee.pin_hash is None:
                    employee.pin_hash = hash_pin(pin)
                    print(f"  PIN demo actualizado para {employee.email}: {pin}")
            db.commit()

            # Seed shifts if missing
            restaurant_center = db.scalars(
                select(Restaurant).where(
                    Restaurant.tenant_id == existing.id,
                    Restaurant.name == "Paffuto Aragón",
                )
            ).first()
            manager = db.scalars(
                select(User).where(
                    User.tenant_id == existing.id,
                    User.role == UserRole.MANAGER.value,
                )
            ).first()
            if restaurant_center is not None and manager is not None:
                employees_by_email = {e.email: e for e in employees if e.email}
                created = seed_shifts(
                    db, existing.id, restaurant_center.id, manager.id, employees_by_email
                )
                if created:
                    db.commit()
                    print(f"  turnos demo creados: {created}")
            return

        tenant = Tenant(name="Restaurante Demo", slug="demo", timezone="Europe/Madrid")
        db.add(tenant)
        db.flush()

        restaurant_center = Restaurant(
            tenant_id=tenant.id,
            name="Paffuto Aragón",
            address="Carrer d'Aragó, Barcelona",
            timezone="Europe/Madrid",
            latitude=41.3916,
            longitude=2.1649,
            geofence_radius_m=100,
            late_tolerance_min=10,
            max_session_hours=14,
        )
        restaurant_beach = Restaurant(
            tenant_id=tenant.id,
            name="Paffuto Barceloneta",
            address="Barceloneta, Barcelona",
            timezone="Europe/Madrid",
            latitude=41.3809,
            longitude=2.1892,
            geofence_radius_m=100,
            late_tolerance_min=10,
            max_session_hours=14,
        )
        db.add_all([restaurant_center, restaurant_beach])
        db.flush()

        manager = User(
            tenant_id=tenant.id,
            email="manager@demo.dev",
            full_name="Manuel Manager",
            password_hash=hash_password("demo-manager"),
            role=UserRole.MANAGER.value,
            status=UserStatus.ACTIVE.value,
        )
        db.add(manager)
        db.flush()

        employees: list[tuple[str, str, str]] = []
        for index, (full_name, email, pin) in enumerate(DEMO_EMPLOYEES):
            emp = User(
                tenant_id=tenant.id,
                email=email,
                full_name=full_name,
                password_hash=hash_password(_employee_password()),
                pin_hash=hash_pin(pin),
                role=UserRole.EMPLOYEE.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(emp)
            db.flush()
            db.add(EmployeeProfile(
                user_id=emp.id,
                tenant_id=tenant.id,
                primary_restaurant_id=restaurant_center.id,
                contract_hours_week=40,
            ))
            employees.append((full_name, emp.email or "", pin))

        # Seed shifts for the next 2 weeks at Paffuto Aragón
        employees_by_email = {
            email: db.scalars(
                select(User).where(User.tenant_id == tenant.id, User.email == email)
            ).first()
            for _, email, _ in DEMO_EMPLOYEES
        }
        shifts_created = seed_shifts(
            db, tenant.id, restaurant_center.id, manager.id, employees_by_email
        )

        magic = create_token(
            subject=manager.id, token_type=TokenType.MAGIC, tenant_id=tenant.id
        )
        db.commit()
        print(f"  turnos demo creados: {shifts_created}")

        print()
        print("=" * 60)
        print("RestaurantOS — datos demo cargados")
        print("=" * 60)
        print(f"Tenant:     {tenant.name} (slug=demo)  id={tenant.id}")
        print("Sucursales:")
        print(f"  - {restaurant_center.name} id={restaurant_center.id}")
        print(f"  - {restaurant_beach.name} id={restaurant_beach.id}")
        print()
        print("Manager:    manager@demo.dev / demo-manager")
        print("Magic link token (24h):")
        print(f"  {magic}")
        print()
        print("Empleados (email / password / PIN kiosk):")
        for name, email, pin in employees:
            print(f"  - {name:30s}  {email} / {_employee_password()} / PIN {pin}")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
