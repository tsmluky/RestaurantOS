"""Aggregates all v1 routers."""
from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    clock,
    employees,
    import_shifts,
    manager,
    notifications,
    restaurants,
    shifts,
)

api_router = APIRouter()
api_router.include_router(auth.router,          prefix="/auth",          tags=["auth"])
api_router.include_router(admin.router,         prefix="/admin",         tags=["admin"])
api_router.include_router(employees.router,     prefix="/employees",     tags=["employees"])
api_router.include_router(restaurants.router,   prefix="/restaurants",   tags=["restaurants"])
api_router.include_router(clock.router,         prefix="/clock",         tags=["clock"])
api_router.include_router(manager.router,       prefix="/manager",       tags=["manager"])
api_router.include_router(shifts.router,        prefix="/shifts",        tags=["shifts"])
api_router.include_router(notifications.router, prefix="/notifications",  tags=["notifications"])
api_router.include_router(import_shifts.router, prefix="