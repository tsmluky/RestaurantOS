"""Onboarding de un cliente real en producción.

Uso:
    python scripts/onboard_client.py \
        --restaurant "La Mona" \
        --manager-name "Antonio García" \
        --manager-email "antonio@lamona.es" \
        --manager-password "cambia-esto-pronto" \
        --address "Calle Mayor 12, Valencia" \
        --lat 39.4699 \
        --lng -0.3763

Variables de entorno necesarias (Railway las inyecta automáticamente):
    DATABASE_URL=postgresql+psycopg://...
"""
from __future__ import annotations

import argparse
import secrets
import string
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import Restaurant, Tenant, User  # noqa: E402
from app.models.employee import EmployeeProfile  # noqa: E402
from app.models.enums import UserRole, UserStatus  # noqa: E402


def _random_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _slug_from_name(name: str) -> str:
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:60]


def main() -> None:
    parser = argparse.ArgumentParser(description="Onboarding cliente RestaurantOS")
    parser.add_argument("--restaurant", required=True, help="Nombre del restaurante")
    parser.add_argument("--manager-name", required=True, help="Nombre completo del manager")
    parser.add_argument("--manager-email", required=True, help="Email del manager")
    parser.add_argument("--manager-password", default=None, help="Contraseña (se genera si no se indica)")
    parser.add_argument("--address", default=None, help="Dirección del restaurante")
    parser.add_argument("--lat", type=float, default=None, help="Latitud (para geofencing)")
    parser.add_argument("--lng", type=float, default=None, help="Longitud (para geofencing)")
    parser.add_argument("--timezone", default="Europe/Madrid", help="Timezone IANA")
    parser.add_argument("--geofence-radius", type=int, default=100, help="Radio geofence en metros")
    args = parser.parse_args()

    password = args.manager_password or _random_password()
    slug = _slug_from_name(args.restaurant)

    db = SessionLocal()
    try:
        # Verificar que el slug no existe ya
        existing = db.scalars(select(Tenant).where(Tenant.slug == slug)).first()
        if existing is not None:
            print(f"ERROR: Ya existe un tenant con slug '{slug}' (id={existing.id})")
            print("Usa un nombre diferente o elimina el tenant existente.")
            sys.exit(1)

        # Verificar que el email no existe
        existing_user = db.scalars(
            select(User).where(User.email == args.manager_email)
        ).first()
        if existing_user is not None:
            print(f"ERROR: El email '{args.manager_email}' ya está en uso.")
            sys.exit(1)

        # Crear tenant
        tenant = Tenant(
            name=args.restaurant,
            slug=slug,
            timezone=args.timezone,
            plan_code="starter",
        )
        db.add(tenant)
        db.flush()

        # Crear restaurante principal
        restaurant = Restaurant(
            tenant_id=tenant.id,
            name=args.restaurant,
            address=args.address,
            timezone=args.timezone,
            latitude=args.lat,
            longitude=args.lng,
            geofence_radius_m=args.geofence_radius,
            late_tolerance_min=10,
            max_session_hours=14,
        )
        db.add(restaurant)
        db.flush()

        # Crear manager
        manager = User(
            tenant_id=tenant.id,
            email=args.manager_email,
            full_name=args.manager_name,
            password_hash=hash_password(password),
            role=UserRole.MANAGER.value,
            status=UserStatus.ACTIVE.value,
        )
        db.add(manager)
        db.flush()

        # Perfil del manager (apunta a su restaurante)
        db.add(EmployeeProfile(
            user_id=manager.id,
            tenant_id=tenant.id,
            primary_restaurant_id=restaurant.id,
            contract_hours_week=40,
        ))

        db.commit()

        print()
        print("=" * 60)
        print("RestaurantOS — cliente creado correctamente")
        print("=" * 60)
        print(f"Restaurante:  {args.restaurant}")
        print(f"Tenant ID:    {tenant.id}")
        print(f"Restaurante ID: {restaurant.id}")
        print()
        print("Credenciales del manager:")
        print(f"  Email:      {args.manager_email}")
        print(f"  Contraseña: {password}")
        print()
        print("Próximos pasos:")
        print("  1. Dar las credenciales al manager")
        print("  2. El manager añade empleados desde la web dashboard")
        print("  3. Los empleados se descargan la app y hacen login")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
