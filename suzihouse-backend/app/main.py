"""
FINZ Backend — FastAPI Application Entrypoint.

Assembles routers, middleware, exception handlers, and lifecycle hooks.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

# ── Logging Setup ─────────────────────────────────────────────────────────
# 앱 모듈 로거를 INFO 레벨로 설정 (기본 WARNING이면 디버그 로그 안 보임)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# CODEF/서비스 관련 로거 명시적 INFO
for _logger_name in ("app.services", "app.external", "app.routers"):
    logging.getLogger(_logger_name).setLevel(logging.INFO)

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import setup_middleware
from app.core.redis import close_redis, init_redis
from app.routers import auth as auth_router
from app.routers import track1 as track1_router
from app.routers import track2 as track2_router
from app.routers import user as user_router
from app.routers import lifecycle as lifecycle_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Fail fast if production configuration is invalid
    settings.validate_production_settings()

    # Development: auto-create tables for SQLite
    if settings.database_url.startswith("sqlite"):
        import app.models  # noqa: F401 — register all models with Base.metadata
        from app.core.database import Base, _get_engine
        async with _get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    try:
        await init_redis()
    except Exception:
        logging.getLogger(__name__).warning("Redis not available — rate limiting disabled")
    yield
    try:
        await close_redis()
    except Exception:
        logging.getLogger(__name__).warning("Redis close failed", exc_info=True)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FINZ 세무 시뮬레이션 백엔드 API",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────────────
setup_middleware(app)

# ── Exception Handlers ─────────────────────────────────────────────────────
register_exception_handlers(app)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(track1_router.router)
app.include_router(track2_router.router)
app.include_router(user_router.router)
app.include_router(lifecycle_router.router)

# ── Health Check ───────────────────────────────────────────────────────────


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


# ── Request Size Limit Middleware ────────────────────────────────────────
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with body larger than max_size bytes to prevent DoS."""

    MAX_BODY_SIZE = 1_048_576  # 1 MB

    async def dispatch(
        self, request, call_next: RequestResponseEndpoint
    ):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            return JSONResponse(
                {"status": "error", "code": "PAYLOAD_TOO_LARGE", "message": "Request body too large"},
                status_code=413,
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)
