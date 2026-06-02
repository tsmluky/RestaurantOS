"""JWT and password/PIN hashing utilities."""
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Two separate contexts to isolate password and PIN hashing.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_pin_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)


# ---------- Passwords ----------

def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return _pwd_context.verify(plain, hashed)


# ---------- PIN ----------

def hash_pin(pin: str) -> str:
    if not pin.isdigit() or not (4 <= len(pin) <= 6):
        raise ValueError("PIN must be 4-6 digits")
    return _pin_context.hash(pin)


def verify_pin(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return _pin_context.verify(plain, hashed)


# ---------- JWT ----------

class TokenType:
    ACCESS = "access"
    REFRESH = "refresh"
    MAGIC = "magic"


def create_token(
    *,
    subject: str | UUID,
    token_type: str = TokenType.ACCESS,
    tenant_id: UUID | None = None,
    role: str | None = None,
    device_id: str | None = None,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(UTC)

    if expires_delta is None:
        if token_type == TokenType.ACCESS:
            expires_delta = timedelta(minutes=settings.jwt_access_ttl_minutes)
        elif token_type == TokenType.REFRESH:
            expires_delta = timedelta(days=settings.jwt_refresh_ttl_days)
        elif token_type == TokenType.MAGIC:
            expires_delta = timedelta(hours=settings.magic_link_ttl_hours)
        else:
            expires_delta = timedelta(minutes=settings.jwt_access_ttl_minutes)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "type": token_type,
    }
    if tenant_id is not None:
        payload["tenant_id"] = str(tenant_id)
    if role is not None:
        payload["role"] = role
    if device_id is not None:
        payload["device_id"] = device_id
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises JWTError if invalid/expired."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


__all__ = [
    "TokenType",
    "create_token",
    "decode_token",
    "hash_password",
    "hash_pin",
    "verify_password",
    "verify_pin",
    "JWTError",
]
