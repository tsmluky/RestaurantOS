"""FastAPI dependencies: DB session, current user, tenant isolation, role guards."""
from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import JWTError, TokenType, decode_token
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _credentials_error(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not token:
        raise _credentials_error("Missing bearer token")

    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise _credentials_error("Invalid or expired token") from exc

    if payload.get("type") != TokenType.ACCESS:
        raise _credentials_error("Wrong token type")

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        raise _credentials_error("Token missing subject")

    try:
        user_id = UUID(user_id_raw)
    except ValueError as exc:
        raise _credentials_error("Invalid user id in token") from exc

    user = db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise _credentials_error("User no longer exists")
    if user.status != "ACTIVE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="User is not active")

    # Attach tenant_id to request.state for downstream use.
    request.state.tenant_id = user.tenant_id
    request.state.user_id = user.id
    request.state.role = user.role
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_tenant_id(user: CurrentUser) -> UUID:
    """Returns the tenant_id of the current user.

    Raises 403 if the user has no tenant (e.g. SUPERADMIN without explicit tenant context).
    Use `get_optional_tenant_id` for endpoints that allow superadmin operations.
    """
    if user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires a tenant context",
        )
    return user.tenant_id


TenantId = Annotated[UUID, Depends(get_tenant_id)]


def require_role(*allowed_roles: UserRole) -> Callable[[User], User]:
    """Factory that returns a dependency enforcing role membership."""
    allowed = {role.value if isinstance(role, UserRole) else role for role in allowed_roles}

    def _check_role(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not allowed for this endpoint",
            )
        return user

    return _check_role


# Shorthand dependencies for common role checks.
require_superadmin = require_role(UserRole.SUPERADMIN)
require_manager = require_role(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.MANAGER)
require_staff = require_role(
    UserRole.SUPERADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.SUPERVISOR
)
