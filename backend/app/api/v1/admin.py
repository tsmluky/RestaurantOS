"""Superadmin endpoints: tenant creation and lifecycle."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_superadmin
from app.core.email import send_magic_link
from app.core.security import TokenType, create_token
from app.models.audit import AuditLog
from app.models.enums import UserRole, UserStatus
from app.models.restaurant import Restaurant
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import (
    CreateManagerRequest,
    CreateManagerResponse,
    CreateRestaurantRequest,
    CreateTenantRequest,
    CreateTenantResponse,
    TenantResponse,
)

router = APIRouter()


@router.post(
    "/tenants",
    response_model=CreateTenantResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superadmin)],
)
async def create_tenant(
    payload: CreateTenantRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(require_superadmin)],
) -> CreateTenantResponse:
    existing = db.scalars(select(Tenant).where(Tenant.slug == payload.slug)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un tenant con slug '{payload.slug}'",
        )

    tenant = Tenant(
        name=payload.name,
        slug=payload.slug,
        timezone=payload.timezone,
        plan_code=payload.plan_code,
    )
    db.add(tenant)
    db.flush()

    restaurant = Restaurant(
        tenant_id=tenant.id,
        name=payload.restaurant_name or payload.name,
        timezone=payload.timezone,
    )
    db.add(restaurant)

    manager = User(
        tenant_id=tenant.id,
        email=payload.manager_email,
        full_name=payload.manager_full_name,
        role=UserRole.MANAGER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(manager)
    db.flush()

    magic_token = create_token(
        subject=manager.id,
        token_type=TokenType.MAGIC,
        tenant_id=tenant.id,
    )

    db.add(AuditLog(
        tenant_id=tenant.id,
        actor_user_id=actor.id,
        action="tenant.created",
        target_type="tenant",
        target_id=tenant.id,
        payload={"slug": tenant.slug, "manager_email": payload.manager_email},
    ))

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto creando tenant (email o slug ya en uso)",
        ) from exc

    db.refresh(tenant)

    background_tasks.add_task(
        send_magic_link,
        manager.email or "",
        manager.full_name,
        magic_token,
    )

    return CreateTenantResponse(
        tenant=TenantResponse.model_validate(tenant),
        manager_user_id=manager.id,
        magic_link_token=magic_token,
    )


@router.get(
    "/tenants",
    response_model=list[TenantResponse],
    dependencies=[Depends(require_superadmin)],
)
def list_tenants(
    db: Annotated[Session, Depends(get_db)],
) -> list[TenantResponse]:
    tenants = db.scalars(
        select(Tenant).where(Tenant.deleted_at.is_(None)).order_by(Tenant.created_at.desc())
    ).all()
    return [TenantResponse.model_validate(t) for t in tenants]


@router.post(
    "/tenants/{tenant_id}/managers",
    response_model=CreateManagerResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superadmin)],
)
async def create_manager(
    tenant_id: UUID,
    payload: CreateManagerRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(require_superadmin)],
) -> CreateManagerResponse:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None or tenant.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

    manager = User(
        tenant_id=tenant.id,
        email=str(payload.email).lower(),
        full_name=payload.full_name,
        role=payload.role,
        status=UserStatus.ACTIVE.value,
    )
    db.add(manager)
    db.flush()

    magic_token = create_token(
        subject=manager.id,
        token_type=TokenType.MAGIC,
        tenant_id=tenant.id,
    )
    db.add(
        AuditLog(
            tenant_id=tenant.id,
            actor_user_id=actor.id,
            action="tenant.manager.created",
            target_type="user",
            target_id=manager.id,
            payload={"email": manager.email, "role": manager.role},
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email ya en uso") from exc

    background_tasks.add_task(
        send_magic_link,
        manager.email or "",
        manager.full_name,
        magic_token,
    )
    return CreateManagerResponse(user_id=manager.id, magic_link_token=magic_token)


@router.post(
    "/tenants/{tenant_id}/restaurants",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superadmin)],
)
def create_restaurant(
    tenant_id: UUID,
    payload: CreateRestaurantRequest,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(require_superadmin)],
) -> dict[str, str]:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None or tenant.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

    restaurant = Restaurant(
        tenant_id=tenant.id,
        name=payload.name,
        address=payload.address,
        timezone=payload.timezone,
        latitude=payload.latitude,
        longitude=payload.longitude,
        geofence_radius_m=payload.geofence_radius_m,
    )
    db.add(restaurant)
    db.flush()
    db.add(
        AuditLog(
            tenant_id=tenant.id,
            actor_user_id=actor.id,
            action="restaurant.created",
            target_type="restaurant",
            target_id=restaurant.id,
            payload={"name": restaurant.name},
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Sucursal duplicada") from exc
    return {"id": str(restaurant.id), "name": restaurant.name}
