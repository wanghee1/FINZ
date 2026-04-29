"""
Tests for configuration security.
"""

import os

import pytest


class TestConfigSecurity:
    """Verify that security-critical config is enforced."""

    def test_secret_key_required(self):
        """SECRET_KEY must not have a default — it should fail without env."""
        # Clear relevant env vars to test
        env_backup = {}
        for key in ["SECRET_KEY", "JWT_SECRET_KEY"]:
            env_backup[key] = os.environ.pop(key, None)

        try:
            from pydantic import ValidationError
            from app.config import Settings

            with pytest.raises(ValidationError):
                Settings(
                    _env_file=None,
                    SECRET_KEY=None,  # type: ignore
                    JWT_SECRET_KEY="test",
                )
        finally:
            for key, val in env_backup.items():
                if val is not None:
                    os.environ[key] = val

    def test_jwt_secret_required(self):
        """JWT_SECRET_KEY must not have a default."""
        from pydantic import ValidationError
        from app.config import Settings

        with pytest.raises(ValidationError):
            Settings(
                _env_file=None,
                SECRET_KEY="test",
                JWT_SECRET_KEY=None,  # type: ignore
            )

    def test_jwt_refresh_secret_separation(self):
        """JWT refresh secret must differ from access secret."""
        from app.config import Settings

        s = Settings(
            _env_file=None,
            SECRET_KEY="test-secret",
            JWT_SECRET_KEY="access-key",
        )
        assert s.jwt_refresh_secret != s.JWT_SECRET_KEY
        assert len(s.jwt_refresh_secret) > 0  # HMAC-derived key is non-empty
        # Derived key is a hex digest, not containing the original key material
        assert len(s.jwt_refresh_secret) == 64  # SHA-256 hex length

    def test_jwt_refresh_secret_explicit(self):
        """Explicit JWT_REFRESH_SECRET_KEY overrides derived value."""
        from app.config import Settings

        s = Settings(
            _env_file=None,
            SECRET_KEY="test-secret",
            JWT_SECRET_KEY="access-key",
            JWT_REFRESH_SECRET_KEY="explicit-refresh-key",
        )
        assert s.jwt_refresh_secret == "explicit-refresh-key"

    def test_database_url_property(self):
        """database_url uses DATABASE_URL if set."""
        from app.config import Settings

        s = Settings(
            _env_file=None,
            SECRET_KEY="s",
            JWT_SECRET_KEY="j",
            DATABASE_URL="sqlite+aiosqlite:///test.db",
        )
        assert s.database_url == "sqlite+aiosqlite:///test.db"

    def test_database_url_requires_password(self):
        """Without DATABASE_URL, DB_PASSWORD is required."""
        from app.config import Settings

        s = Settings(
            _env_file=None,
            SECRET_KEY="s",
            JWT_SECRET_KEY="j",
            DATABASE_URL="",
            DB_PASSWORD="",
        )
        with pytest.raises(ValueError, match="DB_PASSWORD"):
            _ = s.database_url

    def test_is_production(self):
        from app.config import Settings

        dev = Settings(_env_file=None, SECRET_KEY="s", JWT_SECRET_KEY="j", APP_ENV="development")
        assert not dev.is_production

        prod = Settings(_env_file=None, SECRET_KEY="s", JWT_SECRET_KEY="j", APP_ENV="production")
        assert prod.is_production
