"""
User profile API endpoints.

GET   /api/users/me   – Retrieve the authenticated user's profile
PATCH /api/users/me   – Partially update the authenticated user's profile
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


# ── GET /api/users/me ───────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=ApiResponse[UserProfileResponse],
    summary="Get current user profile",
)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UserProfileResponse]:
    profile = await user_service.get_profile(db, current_user.id)
    return ApiResponse(data=profile)


# ── PATCH /api/users/me ─────────────────────────────────────────────────────

@router.patch(
    "/me",
    response_model=ApiResponse[UserProfileResponse],
    summary="Update current user profile",
)
async def update_my_profile(
    request: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UserProfileResponse]:
    profile = await user_service.update_profile(db, current_user.id, request)
    return ApiResponse(data=profile, message="Profile updated successfully")
