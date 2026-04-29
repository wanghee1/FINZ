"""
JWT token management and password hashing utilities.

Provides:
- hash_password / verify_password  (passlib bcrypt)
- create_access_token / create_refresh_token / decode_token  (PyJWT HS256)
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

# ── Password hashing ────────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """Hash a plain-text password and return the bcrypt digest."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ──────────────────────────────────────────────────────────────

def _build_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    """
    Internal helper that constructs a signed JWT.

    Parameters
    ----------
    data : dict
        Must contain ``"sub"`` (subject / user-id).
    expires_delta : timedelta
        How long until the token expires.
    token_type : str
        ``"access"`` or ``"refresh"``.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(data["sub"]),
        "exp": now + expires_delta,
        "iat": now,
        "type": token_type,
    }
    # Merge any extra claims the caller supplies (e.g. roles, scopes)
    for key, value in data.items():
        if key != "sub":
            payload[key] = value

    # Use separate signing keys for access vs refresh tokens
    secret = (
        settings.jwt_refresh_secret
        if token_type == "refresh"
        else settings.JWT_SECRET_KEY
    )

    return jwt.encode(
        payload,
        secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(data: dict) -> str:
    """
    Create a short-lived access JWT.

    ``data`` must include ``{"sub": <user_id>}``.
    Additional claims are merged into the payload.
    """
    expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    return _build_token(data, expires, token_type="access")


def create_refresh_token(data: dict) -> str:
    """
    Create a long-lived refresh JWT.

    ``data`` must include ``{"sub": <user_id>}``.
    """
    expires = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    return _build_token(data, expires, token_type="refresh")


def decode_token(token: str) -> dict:
    """
    Decode and verify an access JWT.

    Returns the full payload dict on success.

    Raises
    ------
    jwt.ExpiredSignatureError
        If the token has expired.
    jwt.InvalidTokenError
        If the token is malformed or the signature is invalid.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_refresh_token(token: str) -> dict:
    """Decode and verify a refresh JWT (uses separate signing key)."""
    return jwt.decode(
        token,
        settings.jwt_refresh_secret,
        algorithms=[settings.JWT_ALGORITHM],
    )
