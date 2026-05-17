"""Aggregates all v1 routers."""
from fastapi import APIRouter

from app.api.v1 import admin, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Future routers (stubs to add in Phase 2-4):
# from app.api.v1 import employees, clock, manager
# api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
# api_router.include_router(clock.router, prefix="/clock", tags=["clock"])
# api_router.include_router(manager.router, prefix="/manager", tags=["manager"])
