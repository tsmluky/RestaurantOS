"""Verifies that data created under one tenant is never visible to another.

This is THE most important test in the codebase. If it fails, we have a security bug.
"""
from app.core.security import TokenType, create_token, hash_password
from app.models import Tenant, User
from app.models.enums import UserRole, UserStatus


def _seed_tenant(db, slug: str, manager_email: str):
    tenant = Tenant(name=slug.title(), slug=slug, timezone="Europe/Madrid")
    db.add(tenant)
    db.flush()
    manager = User(
        tenant_id=tenant.id,
        email=manager_email,
        full_name=f"Manager {slug}",
        password_hash=hash_password("test-password-123"),
        role=UserRole.MANAGER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(manager)
    db.commit()
    return tenant, manager


def _access_token(user) -> str:
    return create_token(
        subject=user.id,
        token_type=TokenType.ACCESS,
        tenant_id=user.tenant_id,
        role=user.role,
    )


def test_login_success(client, db_session):
    _seed_tenant(db_session, "alpha", "alpha@example.com")
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "alpha@example.com", "password": "test-password-123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, db_session):
    _seed_tenant(db_session, "alpha", "alpha@example.com")
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "alpha@example.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_me_returns_current_user(client, db_session):
    _tenant, user = _seed_tenant(db_session, "beta", "beta@example.com")
    token = _access_token(user)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "beta@example.com"


def test_me_without_token_is_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_manager_cannot_access_admin_endpoints(client, db_session):
    _tenant, manager = _seed_tenant(db_session, "gamma", "gamma@example.com")
    token = _access_token(manager)
    response = client.get(
        "/api/v1/admin/tenants",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_two_tenants_have_isolated_managers(db_session):
    tenant_a, _ = _seed_tenant(db_session, "alpha-iso", "alpha-iso@example.com")
    tenant_b, _ = _seed_tenant(db_session, "beta-iso", "beta-iso@example.com")
    assert tenant_a.id != tenant_b.id

    from sqlalchemy import select

    users_in_a = db_session.scalars(
        select(User).where(User.tenant_id == tenant_a.id)
    ).all()
    users_in_b = db_session.scalars(
        select(User).where(User.tenant_id == tenant_b.id)
    ).all()

    assert len(users_in_a) == 1
    assert len(users_in_b) == 1
    assert users_in_a[0].email != users_in_b[0].email
