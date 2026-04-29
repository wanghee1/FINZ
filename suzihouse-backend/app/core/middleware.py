"""
Application middleware stack.

Provides:
- RateLimitMiddleware   – Redis sliding-window rate limiter
- RequestLoggingMiddleware – structured request/response logging
- setup_cors(app)       – configure CORSMiddleware
- setup_middleware(app)  – one-call registration of all middleware
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from app.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

# Fields whose values must be masked in logs
_SENSITIVE_FIELDS: set[str] = {
    "password",
    "new_password",
    "old_password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "secret",
    "api_key",
    "credit_card",
}


# ── Rate Limit Middleware ────────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed sliding-window rate limiter.

    - Anonymous requests: identified by IP, limited to
      ``settings.RATE_LIMIT_ANON`` requests per minute.
    - Authenticated requests: identified by ``user_id`` from the JWT ``sub``
      claim, limited to ``settings.RATE_LIMIT_AUTH`` requests per minute.

    When the limit is exceeded the middleware returns **429 Too Many Requests**
    with a ``Retry-After`` header.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate-limiting if Redis is not connected (e.g. in tests / local dev)
        if redis_client._client is None:
            return await call_next(request)

        try:
            return await self._do_rate_limit(request, call_next)
        except Exception:
            # If Redis fails mid-request, skip rate limiting gracefully
            return await call_next(request)

    async def _do_rate_limit(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:

        # Determine identity and limit
        user_id = self._extract_user_id(request)
        if user_id is not None:
            key = f"rl:user:{user_id}"
            limit = settings.RATE_LIMIT_AUTH
        else:
            # Fall back to client IP
            client_ip = request.client.host if request.client else "unknown"
            key = f"rl:ip:{client_ip}"
            limit = settings.RATE_LIMIT_ANON

        window = 60  # seconds

        # Sliding-window counter via INCR + EXPIRE
        current = await redis_client.incr(key)
        if current == 1:
            # First request in this window – set expiry
            await redis_client.expire(key, window)

        if current > limit:
            # Fetch remaining TTL for the Retry-After header
            ttl_raw = await redis_client.client.ttl(key)
            retry_after = max(int(ttl_raw), 1)
            return Response(
                content='{"status":"error","code":"RATE_LIMITED","message":"Too many requests"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(limit - current, 0))
        return response

    @staticmethod
    def _extract_user_id(request: Request) -> str | None:
        """
        Attempt to read the user id from the Authorization header **without**
        raising.  Returns ``None`` for anonymous requests.
        """
        auth: str | None = request.headers.get("authorization")
        if not auth or not auth.lower().startswith("bearer "):
            return None
        token = auth.split(" ", 1)[1]
        try:
            import jwt as pyjwt

            payload = pyjwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload.get("sub")
        except Exception:
            return None


# ── Request Logging Middleware ───────────────────────────────────────────────

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every request/response with method, path, status code, and duration.

    Sensitive header and query-parameter values are masked before logging.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000

        # Build safe header snapshot
        safe_headers = _mask_dict(dict(request.headers))

        # Build safe query params — redact entirely for auth-sensitive paths
        _sensitive_paths = ("/auth/", "/api/task1/auth/")
        if any(p in request.url.path for p in _sensitive_paths):
            safe_query = {"[REDACTED]": "sensitive endpoint"}
        else:
            safe_query = _mask_dict(dict(request.query_params))

        logger.info(
            "%s %s -> %s (%.1fms) query=%s headers=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            safe_query,
            safe_headers,
        )

        return response


# ── Security Headers Middleware ────────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add standard security headers to every response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'"
        )
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response


# ── Request ID Middleware ─────────────────────────────────────────────────────

class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assign a unique request ID to every request for tracing."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── CORS setup ───────────────────────────────────────────────────────────────

def setup_cors(app: FastAPI) -> None:
    """
    Add CORSMiddleware with settings-driven allowed origins.

    In development ``CORS_ORIGINS`` defaults to ``["*"]``.
    In production, explicitly list allowed origins and restrict methods/headers.
    """
    origins = settings.CORS_ORIGINS
    if origins == ["*"] and not settings.is_production:
        # Dev mode: allow everything without credentials conflict
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    elif origins == ["*"] and settings.is_production:
        # Production with wildcard is a configuration error — refuse to start
        raise ValueError(
            "CORS_ORIGINS=['*'] is not allowed in production. "
            "Set explicit origins in .env, e.g.: "
            'CORS_ORIGINS=["https://app.finz.co.kr"]'
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        )


# ── Master middleware setup ──────────────────────────────────────────────────

def setup_middleware(app: FastAPI) -> None:
    """
    Register all application middleware in the correct order.

    Middleware is executed in **reverse** registration order (last registered
    runs first), so we register in outermost-first order:

    1. CORS (outermost – must run before anything else)
    2. Security headers
    3. Request ID
    4. Request logging
    5. Rate limiting (innermost – runs closest to the route handler)
    """
    # 5 – Rate limiting (innermost)
    app.add_middleware(RateLimitMiddleware)

    # 4 – Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # 3 – Request ID
    app.add_middleware(RequestIdMiddleware)

    # 2 – Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 1 – CORS (outermost)
    setup_cors(app)

    # 0 – HTTPS redirect (production only, outermost)
    if settings.is_production:
        app.add_middleware(HTTPSRedirectMiddleware)


# ── Private helpers ──────────────────────────────────────────────────────────

def _mask_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of *data* with sensitive values replaced by ``'***'``."""
    return {
        k: "***" if k.lower() in _SENSITIVE_FIELDS else v
        for k, v in data.items()
    }
