"""
Application settings loaded from environment variables.

Uses pydantic-settings to read from .env file and environment.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Minimum secret length for production environments
_MIN_SECRET_LENGTH = 32


def _read_secret(env_var: str) -> str | None:
    """Read a Docker secret from the path in ``<ENV_VAR>_FILE``.

    Docker Swarm / Compose mounts secrets under ``/run/secrets/``.
    If the ``_FILE`` env-var is set **and** the file exists, return
    its contents (stripped).  Otherwise return ``None``.
    """
    import os

    file_path = os.environ.get(f"{env_var}_FILE")
    if file_path:
        p = Path(file_path)
        if p.is_file():
            return p.read_text().strip()
    return None


class Settings(BaseSettings):
    """Central configuration for the application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────
    APP_NAME: str = "FINZ"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    SECRET_KEY: str  # 필수 — .env에서 반드시 설정

    # ── Database (async MySQL via aiomysql) ───────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "suzihouse"
    DB_USER: str = "suzihouse"
    DB_PASSWORD: str = ""
    DATABASE_URL: str = ""  # 설정 시 DB_* 필드 대신 사용됨

    # ── Redis ─────────────────────────────────────────────────────────────
    # Production: redis://:password@host:port/db
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT / Auth ────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str  # 필수 — .env에서 반드시 설정 (access token용)
    JWT_REFRESH_SECRET_KEY: str = ""  # 프로덕션에서는 반드시 별도 설정 필요
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    def model_post_init(self, __context: object) -> None:
        """Override fields with Docker secrets (``*_FILE`` env vars) if present."""
        for field, attr in [
            ("DB_PASSWORD", "DB_PASSWORD"),
            ("JWT_SECRET_KEY", "JWT_SECRET_KEY"),
        ]:
            secret = _read_secret(field)
            if secret:
                object.__setattr__(self, attr, secret)

    @property
    def jwt_refresh_secret(self) -> str:
        """Return the refresh token signing key (separate from access).

        Uses HKDF derivation as fallback instead of simple concatenation.
        Production environments MUST set JWT_REFRESH_SECRET_KEY explicitly.
        """
        if self.JWT_REFRESH_SECRET_KEY:
            return self.JWT_REFRESH_SECRET_KEY
        if self.is_production:
            raise ValueError(
                "JWT_REFRESH_SECRET_KEY must be explicitly set in production. "
                "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        # Development fallback: HKDF-derived key (not simple concatenation)
        import hashlib
        import hmac
        return hmac.new(
            b"suzihouse-refresh-key-derivation",
            self.JWT_SECRET_KEY.encode(),
            hashlib.sha256,
        ).hexdigest()

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]  # 개발용 기본값; 프로덕션에서는 명시적 설정 필요

    # ── Rate Limiting (requests per minute) ───────────────────────────────
    RATE_LIMIT_ANON: int = 100
    RATE_LIMIT_AUTH: int = 300

    # ── CODEF API (공공데이터 연동) ───────────────────────────────────────
    CODEF_CLIENT_ID: str = ""
    CODEF_CLIENT_SECRET: str = ""
    CODEF_BASE_URL: str = "https://development.codef.io"
    CODEF_PUBLIC_KEY: str = ""  # RSA 공개키 (키 관리에서 확인)

    # ── MOLIT API (국토교통부 실거래가) ───────────────────────────────────
    MOLIT_API_KEY: str = ""
    MOLIT_BASE_URL: str = "https://apis.data.go.kr"

    # ── OpenAI ────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # ── Celery ────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @property
    def database_url(self) -> str:
        """Return DATABASE_URL if explicitly set, otherwise build from DB_* fields."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if not self.DB_PASSWORD:
            raise ValueError(
                "DB_PASSWORD 또는 DATABASE_URL을 .env에서 반드시 설정해야 합니다."
            )
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    def validate_production_settings(self) -> None:
        """Validate critical settings for production deployment.

        Called during application startup to fail fast on misconfiguration.
        """
        if not self.is_production:
            return

        errors: list[str] = []

        if len(self.SECRET_KEY) < _MIN_SECRET_LENGTH:
            errors.append(
                f"SECRET_KEY must be at least {_MIN_SECRET_LENGTH} characters"
            )
        if len(self.JWT_SECRET_KEY) < _MIN_SECRET_LENGTH:
            errors.append(
                f"JWT_SECRET_KEY must be at least {_MIN_SECRET_LENGTH} characters"
            )
        if not self.JWT_REFRESH_SECRET_KEY:
            errors.append("JWT_REFRESH_SECRET_KEY must be explicitly set")
        if self.CORS_ORIGINS == ["*"]:
            errors.append(
                "CORS_ORIGINS must be explicitly set (not wildcard)"
            )
        if self.DEBUG:
            errors.append("DEBUG must be False in production")

        if errors:
            raise ValueError(
                "Production configuration errors:\n  - " + "\n  - ".join(errors)
            )

    @property
    def database_url_sync(self) -> str:
        """Return a synchronous database URL for Alembic migrations."""
        url = self.database_url
        url = url.replace("+aiomysql", "+pymysql")
        url = url.replace("+aiosqlite", "")
        return url


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton).

    Using ``lru_cache`` ensures the .env file is read only once and the
    same ``Settings`` instance is reused across the application lifetime.
    """
    return Settings()


settings: Settings = get_settings()
