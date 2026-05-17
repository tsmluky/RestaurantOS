"""Application settings loaded from environment variables."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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
    database_url: str = Field(
        default="postgresql+psycopg://restaurantos:restaurantos@localhost:5432/restaurantos"
    )

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
