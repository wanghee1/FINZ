"""
Custom exception hierarchy and FastAPI exception handlers.

Usage::

    from app.core.exceptions import NotFoundException
    raise NotFoundException(message="User not found")

Register handlers once during app initialisation::

    from app.core.exceptions import register_exception_handlers
    register_exception_handlers(app)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


# ── Base exception ───────────────────────────────────────────────────────────

class AppException(Exception):
    """
    Base application exception.

    All domain-specific errors should inherit from this class so they are
    caught by the unified handler and returned as structured JSON.

    Parameters
    ----------
    status_code : int
        HTTP status code to return.
    code : str
        Machine-readable error code (e.g. ``"NOT_FOUND"``).
    message : str
        Human-readable error description.
    """

    def __init__(
        self,
        status_code: int = 500,
        code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred",
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


# ── Concrete exceptions ─────────────────────────────────────────────────────

class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(status_code=404, code="NOT_FOUND", message=message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(status_code=401, code="UNAUTHORIZED", message=message)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request") -> None:
        super().__init__(status_code=400, code="BAD_REQUEST", message=message)


class ConflictException(AppException):
    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__(status_code=409, code="CONFLICT", message=message)


class RateLimitException(AppException):
    def __init__(self, message: str = "Too many requests") -> None:
        super().__init__(status_code=429, code="RATE_LIMITED", message=message)


# ── Handler registration ────────────────────────────────────────────────────

def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """Build the standard JSON error envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "code": code,
            "message": message,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Attach global exception handlers to the FastAPI application.

    Handles:
    - ``AppException`` (and all subclasses)
    - Starlette/FastAPI ``HTTPException`` (e.g. 404 from missing routes)
    - Unhandled ``Exception`` (returns generic 500)
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(
        _request: Request, exc: AppException
    ) -> JSONResponse:
        logger.warning(
            "AppException: code=%s status=%s message=%s",
            exc.code,
            exc.status_code,
            exc.message,
        )
        return _error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _error_response(
            exc.status_code,
            "HTTP_ERROR",
            str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.warning("Validation error: %s", exc.errors())
        # 클라이언트에는 내부 필드명을 숨긴 요약만 반환
        safe_errors = []
        for err in exc.errors():
            safe_errors.append({
                "field": ".".join(str(loc) for loc in err.get("loc", []) if loc != "body"),
                "message": err.get("msg", "유효하지 않은 값입니다"),
            })
        return JSONResponse(
            status_code=422,
            content={
                "status": "error",
                "code": "VALIDATION_ERROR",
                "message": "입력값이 올바르지 않습니다",
                "detail": safe_errors,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return _error_response(
            500,
            "INTERNAL_ERROR",
            "An unexpected error occurred",
        )
