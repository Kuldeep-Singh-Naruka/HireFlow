from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-level settings loaded from environment variables."""

    # Required: Neon (or any PostgreSQL) connection string.
    # Example: postgresql+psycopg2://user:pass@host/dbname?sslmode=require
    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Single global instance — imported everywhere as `from app.core.config import settings`
settings = Settings()  # type: ignore[call-arg]
