"""
User profile business-logic layer.

Provides get and partial-update operations for the authenticated user's
profile.  The router delegates here to keep endpoints thin.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserProfileResponse, UserProfileUpdate


def _active_user_query(user_id: int):
    """Build a select query that excludes soft-deleted users."""
    return select(User).where(
        User.id == user_id,
        User.is_active.is_(True),
        User.deleted_at.is_(None),
    )


async def get_profile(db: AsyncSession, user_id: int) -> UserProfileResponse:
    """Return the full profile for *user_id*.

    Raises HTTP 404 if the user does not exist or has been soft-deleted.
    """
    result = await db.execute(_active_user_query(user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserProfileResponse.model_validate(user)


async def update_profile(
    db: AsyncSession,
    user_id: int,
    request: UserProfileUpdate,
) -> UserProfileResponse:
    """Partially update the profile for *user_id*.

    Only non-``None`` fields in *request* are written to the database.
    Raises HTTP 404 if the user does not exist or has been soft-deleted.
    """
    result = await db.execute(_active_user_query(user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Apply only the fields that the caller explicitly provided
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)

    return UserProfileResponse.model_validate(user)
