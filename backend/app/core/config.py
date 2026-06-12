"""Application settings loaded from environment variables."""
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "RestaurantOS"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    # Railway inyecta DATABASE_URL como "postgresql://..." — lo normalizamos a psycopg3
    database_url: str = Field(
        default="postgresql+psycopg://restaurantos:restaurantos@localhost:5432/restaurantos"
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Convierte postgresql:// y postgres:// al esquema postgresql+psycopg:// que usa psycopg3."""
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+psycopg://", 1)
            elif v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    # JWT
    jwt_secret_key: str = Field(default="dev-only-change-in-prod")
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 7
    magic_link_ttl_hours: int = 24

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006"

    # Stripe
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "noreply@restaurantos.app"
    web_app_url: str = "http://localhost:3000"

    # Limits
    max_pin_attempts: int = 5
    pin_lockout_seconds: int = 300
    default_max_session_hours: int = 14
    default_late_tolerance_min: int = 10

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
