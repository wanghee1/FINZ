"""
Auth API endpoints.

POST /auth/signup   – Register a new user
POST /auth/login    – Obtain access + refresh tokens
POST /auth/refresh  – Exchange a refresh token for a new pair
POST /auth/logout   – Revoke a refresh token (requires auth)
DELETE /auth/account – Soft-delete the current user's account (requires auth)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import ApiResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


# ── POST /auth/signup ────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def signup(
    request: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UserResponse]:
    user = await auth_service.signup(db, request)
    return ApiResponse(data=user, message="Account created successfully")


# ── POST /auth/login ─────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    summary="Authenticate and obtain tokens",
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    tokens = await auth_service.login(db, request)
    return ApiResponse(data=tokens, message="Login successful")


# ── POST /auth/refresh ───────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    summary="Refresh an expired access token",
)
async def refresh(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    tokens = await auth_service.refresh_token(db, request)
    return ApiResponse(data=tokens, message="Token refreshed")


# ── POST /auth/logout ────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=ApiResponse,
    summary="Revoke the current refresh token",
)
async def logout(
    request: LogoutRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    await auth_service.logout(db, current_user.id, request.refresh_token)
    return ApiResponse(message="Logged out successfully")


# ── DELETE /auth/account ─────────────────────────────────────────────────────

@router.delete(
    "/account",
    response_model=ApiResponse,
    summary="Soft-delete the current user's account",
)
async def delete_account(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    await auth_service.delete_account(db, current_user.id)
    return ApiResponse(message="Account deleted successfully")
