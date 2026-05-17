"""Authentication endpoints: login, refresh, magic link, current user."""
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import (
    JWTError,
    TokenType,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.audit import AuditLog
from app.models.enums import UserStatus
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    MagicLinkRequest,
    MagicLinkVerifyRequest,
    RefreshRequest,
    TokenResponse,
)

router = APIRouter()


def _build_tokens(user: User) -> TokenResponse:
    access = create_token(
        subject=user.id,
        token_type=TokenType.ACCESS,
        tenant_id=user.tenant_id,
        role=user.role,
    )
    refresh = create_token(
        subject=user.id,
        token_type=TokenType.REFRESH,
        tenant_id=user.tenant_id,
    )
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=settings.jwt_access_ttl_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    stmt = select(User).where(
        User.email == payload.email,
        User.deleted_at.is_(None),
    )
    user = db.scalars(stmt).first()

    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    user.last_login_at = datetime.now(UTC)
    db.add(AuditLog(
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        action="auth.login",
        target_type="user",
        target_id=user.id,
    ))
    db.commit()

    return _build_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    try:
        claims = decode_token(payload.refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        ) from exc

    if claims.get("type") != TokenType.REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token incorrecto",
        )

    user_id = claims.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no disponible",
        )

    return _build_tokens(user)


@router.post("/magic-link", status_code=status.HTTP_202_ACCEPTED)
def request_magic_link(
    payload: MagicLinkRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Issue a magic link token. Always responds 202 to avoid email enumeration."""
    user = db.scalars(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    ).first()

    if user is not None and user.status == UserStatus.ACTIVE.value:
        token = create_token(
            subject=user.id,
            token_type=TokenType.MAGIC,
            tenant_id=user.tenant_id,
        )
        # TODO Phase 1.5: send via SMTP.
        # For now log so we can copy from server output in dev.
        if not settings.is_production:
            print(f"[DEV] Magic link for {user.email}: {token}")

    return {"status": "ok"}


@router.post("/magic-link/verify", response_model=TokenResponse)
def verify_magic_link(
    payload: MagicLinkVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    try:
        claims = decode_token(payload.token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Magic link inválido o expirado",
        ) from exc

    if claims.get("type") != TokenType.MAGIC:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token incorrecto",
        )

    user_id = claims.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no disponible",
        )

    if payload.new_password:
        user.password_hash = hash_password(payload.new_password)
    user.last_login_at = datetime.now(UTC)
    db.add(AuditLog(
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        action="auth.magic_link.verified",
        target_type="user",
        target_id=user.id,
    ))
    db.commit()

    return _build_tokens(user)


@router.get("/me", response_model=CurrentUserResponse)
def me(user: CurrentUser) -> CurrentUserResponse:
    return CurrentUserResponse.model_validate(user)
