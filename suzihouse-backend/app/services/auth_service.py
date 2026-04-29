"""
Auth business-logic layer.

All database mutations and token operations for signup, login,
refresh, logout, and account deletion live here.  The router
delegates to these functions to keep endpoints thin.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.account_lock import (
    check_account_locked,
    clear_failed_attempts,
    record_failed_attempt,
)
from app.core.audit import log_security_event
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.auth import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _hash_refresh_token(raw_token: str) -> str:
    """Return a SHA-256 hex digest of the raw refresh JWT.

    We never store the refresh token verbatim; only its hash.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _build_token_response(user: User) -> tuple[TokenResponse, str]:
    """Create an access + refresh token pair and return them along with
    the raw refresh token (needed to store its hash).

    Returns
    -------
    (TokenResponse, raw_refresh_token)
    """
    token_data = {"sub": str(user.id), "role": user.role.value}

    access_token = create_access_token(token_data)
    raw_refresh = create_refresh_token(token_data)

    expires_in = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds

    token_resp = TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
    )
    return token_resp, raw_refresh


async def _store_refresh_token(
    db: AsyncSession,
    user_id: int,
    raw_refresh: str,
) -> None:
    """Persist the hashed refresh token in the database."""
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    rt = RefreshToken(
        user_id=user_id,
        token_hash=_hash_refresh_token(raw_refresh),
        expires_at=expires_at,
    )
    db.add(rt)
    await db.flush()


# ── Public API ───────────────────────────────────────────────────────────────

async def signup(db: AsyncSession, request: SignupRequest) -> UserResponse:
    """Register a new user account.

    Raises HTTP 409 if the email is already taken.
    """
    from app.services.consent_service import record_consent

    # Check for existing email (use generic message to prevent enumeration)
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="회원가입을 처리할 수 없습니다. 입력 정보를 확인해주세요.",
        )

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        birth_date=request.birth_date,
        gender=request.gender,
        phone=request.phone,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Record consent grants
    for consent in request.consents:
        await record_consent(
            db=db,
            user_id=user.id,
            consent_type=consent.consent_type,
            version=consent.version,
            granted=consent.granted,
        )

    return UserResponse.model_validate(user)


async def login(db: AsyncSession, request: LoginRequest) -> TokenResponse:
    """Authenticate with email + password and return a token pair.

    Raises HTTP 401 on bad credentials or inactive account.
    Raises HTTP 429 if the account is locked due to repeated failures.
    """
    # ── Account lockout check ─────────────────────────────────────────
    if await check_account_locked(request.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.",
        )

    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        await record_failed_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, user.password_hash):
        await record_failed_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )

    # ── Login success — clear lockout counter ─────────────────────────
    await clear_failed_attempts(request.email)

    token_resp, raw_refresh = _build_token_response(user)
    await _store_refresh_token(db, user.id, raw_refresh)

    return token_resp


async def refresh_token(
    db: AsyncSession, request: RefreshRequest
) -> TokenResponse:
    """Exchange a valid refresh token for a new token pair.

    The old refresh token is revoked and a fresh pair is issued.
    Raises HTTP 401 if the refresh token is invalid, expired, or revoked.
    """
    # ── Decode (use refresh-specific secret) ────────────────────────────
    try:
        payload = decode_refresh_token(request.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token",
        )

    user_id = int(payload["sub"])

    # ── Verify stored hash ───────────────────────────────────────────────
    token_hash = _hash_refresh_token(request.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
        )
    )
    stored = result.scalar_one_or_none()

    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not recognised",
        )

    if stored.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    # ── Revoke old, issue new ────────────────────────────────────────────
    stored.revoked_at = datetime.now(timezone.utc)

    # Fetch user for new token claims
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
        )

    token_resp, raw_refresh = _build_token_response(user)
    await _store_refresh_token(db, user.id, raw_refresh)

    # Audit log for token refresh
    await log_security_event(
        db,
        "TOKEN_REFRESH",
        user_id=user.id,
        resource="refresh_token",
        details="Token pair refreshed successfully",
    )

    return token_resp


async def logout(
    db: AsyncSession,
    user_id: int,
    raw_refresh_token: str,
) -> None:
    """Revoke the given refresh token.

    Silently succeeds if the token is already revoked or not found
    (to avoid leaking information).
    """
    token_hash = _hash_refresh_token(raw_refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def delete_account(
    db: AsyncSession,
    user_id: int,
    request: object | None = None,
) -> None:
    """Soft-delete a user account.

    Sets ``deleted_at`` and ``is_active = False``.  Also revokes all
    outstanding refresh tokens and records consent withdrawal.

    PII is fully purged after 30 days by the data retention job.
    """
    from app.services.consent_service import record_consent

    now = datetime.now(timezone.utc)

    # Record consent withdrawal for all types
    for consent_type in ["PRIVACY_POLICY", "TERMS_OF_SERVICE", "MARKETING"]:
        await record_consent(
            db=db,
            user_id=user_id,
            consent_type=consent_type,
            version="withdrawal",
            granted=False,
            detail="Account deletion requested",
        )

    # Soft-delete user
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_active=False, deleted_at=now)
    )

    # Revoke all refresh tokens
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
