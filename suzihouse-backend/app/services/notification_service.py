"""
Notification settings business-logic layer.

Manages per-user notification preferences (SEASON, LIFECYCLE, SYSTEM).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationTypeEnum
from app.models.notification import UserNotification


async def get_notifications(
    db: AsyncSession,
    user_id: int,
) -> list[dict]:
    """Return all notification settings for *user_id*.

    Each item in the returned list is a dict with ``type`` and ``enabled``.
    If the user has no saved preferences yet, the function returns an empty
    list (the caller / frontend can apply defaults).
    """
    result = await db.execute(
        select(UserNotification).where(UserNotification.user_id == user_id)
    )
    rows = result.scalars().all()

    return [
        {"type": row.type.value, "enabled": row.enabled}
        for row in rows
    ]


async def update_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    enabled: bool,
) -> dict:
    """Create or update a single notification preference.

    Parameters
    ----------
    notification_type : str
        One of the ``NotificationTypeEnum`` values (``SEASON``, ``LIFECYCLE``,
        ``SYSTEM``).
    enabled : bool
        Whether the notification channel is turned on.

    Returns
    -------
    dict
        The persisted setting as ``{"type": ..., "enabled": ...}``.
    """
    # Validate the incoming type string against the enum
    try:
        ntype = NotificationTypeEnum(notification_type)
    except ValueError:
        valid = ", ".join(e.value for e in NotificationTypeEnum)
        raise ValueError(
            f"Invalid notification_type '{notification_type}'. "
            f"Must be one of: {valid}"
        )

    # Look for an existing row
    result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user_id,
            UserNotification.type == ntype,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing.enabled = enabled
        await db.flush()
        await db.refresh(existing)
        return {"type": existing.type.value, "enabled": existing.enabled}

    # Create a new row
    notification = UserNotification(
        user_id=user_id,
        type=ntype,
        enabled=enabled,
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)

    return {"type": notification.type.value, "enabled": notification.enabled}
