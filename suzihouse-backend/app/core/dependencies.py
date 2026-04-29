"""
Reusable FastAPI dependencies.

Provides:
- get_db          – async DB session (re-exported from database module)
- get_current_user         – mandatory auth; extracts user_id from Bearer JWT
- get_current_user_optional – optional auth; returns None when no token present
"""

from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db  # noqa: F401 – re-export for convenience
from app.core.security import decode_token

# ── Security scheme ──────────────────────────────────────────────────────────
# auto_error=True  -> raises 403 when header is missing (used for mandatory auth)
# auto_error=False -> returns None when header is missing (used for optional auth)
_bearer_required = HTTPBearer(auto_error=True)
_bearer_optional = HTTPBearer(auto_error=False)


# ── Mandatory auth ───────────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_required),
) -> str:
    """
    Extract and validate the Bearer token from the ``Authorization`` header.

    Returns the ``user_id`` (the ``sub`` claim) as a string.

    Raises
    ------
    HTTPException 401
        If the token is missing, expired, or otherwise invalid.
    """
    return _extract_user_id(credentials)


# ── Optional auth ────────────────────────────────────────────────────────────
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
) -> str | None:
    """
    Same as :func:`get_current_user` but returns ``None`` when no
    ``Authorization`` header is present.  Useful for endpoints that behave
    differently for authenticated vs. anonymous users.
    """
    if credentials is None:
        return None
    return _extract_user_id(credentials)


# ── Internal helper ──────────────────────────────────────────────────────────
def _extract_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Decode a Bearer JWT and return the ``sub`` claim."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Ensure this is an access token, not a refresh token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type; access token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
