"""
Async SQLAlchemy engine and session management.

Provides:
- Async engine bound to DATABASE_URL
- AsyncSessionLocal factory for creating sessions
- get_db() async generator for FastAPI dependency injection
"""

from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ── Async Engine (lazy initialization) ───────────────────────────────────────
_engine = None
_session_factory = None


def _get_engine():
    global _engine
    if _engine is None:
        kwargs: dict = {
            # Never echo SQL in production — queries may contain PII
            "echo": settings.DEBUG and not settings.is_production,
        }
        # SQLite doesn't support connection pool parameters
        if settings.database_url.startswith("sqlite"):
            # SQLite: increase lock timeout and use NullPool to avoid concurrency issues
            kwargs["connect_args"] = {"timeout": 30, "check_same_thread": False}
            kwargs["poolclass"] = NullPool
        else:
            kwargs.update(
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=3600,
            )
        _engine = create_async_engine(settings.database_url, **kwargs)

        # Enable WAL mode for SQLite (much better concurrency)
        if settings.database_url.startswith("sqlite"):
            @event.listens_for(_engine.sync_engine, "connect")
            def _set_sqlite_pragma(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA busy_timeout=30000")
                cursor.close()
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=_get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


# Backward-compatible module-level accessors
class _LazyEngine:
    """Proxy so `from app.core.database import engine` doesn't connect at import time."""
    def __getattr__(self, name):
        return getattr(_get_engine(), name)

class _LazySessionLocal:
    def __call__(self, *args, **kwargs):
        return _get_session_factory()(*args, **kwargs)
    def __getattr__(self, name):
        return getattr(_get_session_factory(), name)


engine = _LazyEngine()
AsyncSessionLocal = _LazySessionLocal()


# ── Declarative Base ─────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


# ── Dependency ───────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.

    Usage::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...

    The session is automatically closed when the request finishes.
    If an unhandled exception occurs the transaction is rolled back.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
