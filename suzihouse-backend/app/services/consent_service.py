"""
Consent tracking service.

Records and queries user consent for personal data processing.
"""

from __future__ import annotations

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentLog


async def record_consent(
    db: AsyncSession,
    user_id: int,
    consent_type: str,
    version: str,
    granted: bool,
    request: Request | None = None,
    detail: str | None = None,
) -> ConsentLog:
    """Record a consent grant or withdrawal."""
    log = ConsentLog(
        user_id=user_id,
        consent_type=consent_type,
        version=version,
        granted=granted,
        ip_address=request.client.host if request and request.client else None,
        user_agent=(
            request.headers.get("user-agent", "")[:500]
            if request else None
        ),
        detail=detail,
    )
    db.add(log)
    await db.flush()
    return log


async def get_active_consents(
    db: AsyncSession,
    user_id: int,
) -> dict[str, bool]:
    """Return a dict of consent_type -> granted for the user's latest consents."""
    result = await db.execute(
        select(ConsentLog)
        .where(ConsentLog.user_id == user_id)
        .order_by(ConsentLog.created_at.desc())
    )
    logs = result.scalars().all()

    # Latest consent per type wins
    consents: dict[str, bool] = {}
    for log in logs:
        if log.consent_type not in consents:
            consents[log.consent_type] = log.granted

    return consents


async def has_active_consent(
    db: AsyncSession,
    user_id: int,
    consent_type: str,
) -> bool:
    """Check if the user has an active (granted) consent of the given type."""
    consents = await get_active_consents(db, user_id)
    return consents.get(consent_type, False)
