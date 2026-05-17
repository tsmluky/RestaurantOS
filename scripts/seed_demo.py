"""Create a demo tenant + manager + a few employees for local development.

Run from the repo root:
    python scripts/seed_demo.py
"""
from __future__ import annotations

import random
import string
import sys
from pathlib import Path

# Make `app` importable when running from repo root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import TokenType, create_token, hash_password, hash_pin  # noqa: E402
from app.models import Restaurant, Tenant, User  # noqa: E402
from app.models.employee import EmployeeProfile  # noqa: E402
from app.models.enums import UserRole, UserStatus  # noqa: E402


def _random_pin() -> str:
    return "".join(random.choices(string.digits, k=4))


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
            print(f"  superadmin: admin@studio32.dev / studio32-admin")

        # Demo tenant
        existing = db.scalars(select(Tenant).where(Tenant.slug == "demo")).first()
        if existing is not None:
            print(f"  tenant 'demo' ya existe: {existing.id}")
            return

        tenant = Tenant(name="Restaurante Demo", slug="demo", timezone="Europe/Madrid")
        db.add(tenant)
        db.flush()

        restaurant = Restaurant(
            tenant_id=tenant.id,
            name="Restaurante Demo — Centro",
            timezone="Europe/Madrid",
            late_tolerance_min=10,
            max_session_hours=14,
        )
        db.add(restaurant)
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

        employees: list[tuple[str, str]] = []
        for full_name in [
            "María García",
            "Cristian Pérez",
            "Rocío Sánchez",
            "Francisco Iannicelli",
            "Joana Liberti",
        ]:
            pin = _random_pin()
            emp = User(
                tenant_id=tenant.id,
                full_name=full_name,
                pin_hash=hash_pin(pin),
                role=UserRole.EMPLOYEE.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(emp)
            db.flush()
            db.add(EmployeeProfile(
                user_id=emp.id,
                tenant_id=tenant.id,
                primary_restaurant_id=restaurant.id,
                contract_hours_week=40,
            ))
            employees.append((full_name, pin))

        magic = create_token(
            subject=manager.id, token_type=TokenType.MAGIC, tenant_id=tenant.id
        )
        db.commit()

        print()
        print("=" * 60)
        print("RestaurantOS — datos demo cargados")
        print("=" * 60)
        print(f"Tenant:     {tenant.name} (slug=demo)  id={tenant.id}")
        print(f"Restaurante:{restaurant.name}")
        print()
        print(f"Manager:    manager@demo.dev / demo-manager")
        print(f"Magic link token (24h):")
        print(f"  {magic}")
        print()
        print("Empleados (nombre / PIN):")
        for name, pin in employees:
            print(f"  - {name:30s}  PIN: {pin}")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
