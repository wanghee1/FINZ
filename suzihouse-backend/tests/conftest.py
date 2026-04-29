"""
Shared test fixtures for the suzihouse-backend test suite.

Provides:
- Async SQLAlchemy test database (SQLite in-memory) [integration tests]
- FastAPI TestClient [integration tests]
- Engine tests (test_track1_engine, test_track2_engine) don't need DB fixtures
"""

import asyncio
from collections.abc import AsyncGenerator

import pytest

# ── Integration test fixtures (only loaded when httpx/DB deps are available) ─
# Engine-only tests skip these fixtures safely.

try:
    import pytest_asyncio
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy.ext.asyncio import (
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )
    from app.core.database import Base, get_db
    from app.main import app

    _HAS_INTEGRATION_DEPS = True
except ImportError:
    _HAS_INTEGRATION_DEPS = False

if _HAS_INTEGRATION_DEPS:
    # ── Test DB Engine (SQLite async in-memory) ──────────────────────────
    TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # ── Fixtures ─────────────────────────────────────────────────────────

    @pytest.fixture(scope="session")
    def event_loop():
        """Create a single event loop for the entire test session."""
        loop = asyncio.new_event_loop()
        yield loop
        loop.close()

    @pytest_asyncio.fixture(scope="session", autouse=True)
    async def setup_database():
        """Create all tables before tests and drop after."""
        import app.models  # noqa: F401

        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    @pytest_asyncio.fixture
    async def db_session() -> AsyncGenerator[AsyncSession, None]:
        """Yield a fresh DB session for each test, rolled back after."""
        async with TestSessionLocal() as session:
            yield session
            await session.rollback()

    @pytest_asyncio.fixture
    async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
        """Yield an async HTTP client bound to the FastAPI app."""

        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        app.dependency_overrides.clear()
