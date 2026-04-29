"""
Audit logging utility for security-relevant events.

Provides both application-level logging and DB persistence.

Event types:
    LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, SIGNUP,
    ACCOUNT_DELETE, DATA_ACCESS, ADMIN_ACTION,
    TOKEN_REFRESH, RATE_LIMIT_HIT, AUTH_LOCKOUT
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

audit_logger = logging.getLogger("audit")


def _get_client_ip(request: Request | None) -> str | None:
    """Extract client IP from the request."""
    if request is None:
        return None
    if request.client:
        return request.client.host
    return request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or None


def _get_user_agent(request: Request | None) -> str | None:
    """Extract user agent from the request."""
    if request is None:
        return None
    return request.headers.get("User-Agent")


async def log_security_event(
    db: AsyncSession,
    event_type: str,
    *,
    user_id: int | None = None,
    request: Request | None = None,
    resource: str | None = None,
    resource_id: str | None = None,
    details: str | None = None,
) -> None:
    """Record a security event to both the audit log table and application log.

    Parameters
    ----------
    db : AsyncSession
        Database session for persisting the audit record.
    event_type : str
        Event category (e.g. LOGIN_SUCCESS, LOGIN_FAILURE).
    user_id : int | None
        The user performing the action (None for anonymous).
    request : Request | None
        The incoming HTTP request (for IP and User-Agent extraction).
    resource : str | None
        The resource being accessed (e.g. "user", "simulation").
    resource_id : str | None
        The specific resource identifier.
    details : str | None
        Additional human-readable context.
    """
    ip = _get_client_ip(request)
    ua = _get_user_agent(request)

    # Application-level log
    audit_logger.info(
        "AUDIT event=%s user_id=%s ip=%s resource=%s resource_id=%s details=%s",
        event_type,
        user_id,
        ip,
        resource,
        resource_id,
        details,
    )

    # DB persistence
    try:
        record = AuditLog(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip,
            user_agent=ua,
            resource=resource,
            resource_id=resource_id,
            details=details,
        )
        db.add(record)
        await db.flush()
    except Exception:
        audit_logger.warning(
            "Failed to persist audit log: event=%s user_id=%s",
            event_type, user_id, exc_info=True,
        )
