"""Manager endpoints for restaurant locations."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, TenantId, require_manager
from app.models.audit import AuditLog
from app.models.restaurant import Restaurant
from app.schemas.restaurant import (
    RestaurantCreateRequest,
    RestaurantResponse,
    RestaurantUpdateRequest,
)

router = APIRouter(dependencies=[Depends(require_manager)])


@router.get("", response_model=list[RestaurantResponse])
def list_restaurants(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
) -> list[Restaurant]:
    return list(
        db.scalars(
            select(Restaurant)
            .where(Restaurant.tenant_id == tenant_id, Restaurant.deleted_at.is_(None))
            .order_by(Restaurant.name.asc())
        ).all()
    )


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    payload: RestaurantCreateRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Restaurant:
    restaurant = Restaurant(tenant_id=tenant_id, **payload.model_dump())
    db.add(restaurant)
    db.flush()
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="restaurant.created",
            target_type="restaurant",
            target_id=restaurant.id,
            payload=payload.model_dump(mode="json"),
        )
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Sucursal duplicada") from exc
    db.refresh(restaurant)
    return restaurant


@router.patch("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(
    restaurant_id: UUID,
    payload: RestaurantUpdateRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Restaurant:
    restaurant = db.scalar(
        select(Restaurant).where(
            Restaurant.id == restaurant_id,
            Restaurant.tenant_id == tenant_id,
            Restaurant.deleted_at.is_(None),
        )
    )
    if restaurant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    before = {
        "name": restaurant.name,
        "address": restaurant.address,
        "geofence_radius_m": restaurant.geofence_radius_m,
    }
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(restaurant, field, value)

    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="restaurant.updated",
            target_type="restaurant",
            target_id=restaurant.id,
            payload={
                "before": before,
                "after": payload.model_dump(mode="json", exclude_unset=True),
            },
        )
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Sucursal duplicada") from exc
    db.refresh(restaurant)
    return restaurant
