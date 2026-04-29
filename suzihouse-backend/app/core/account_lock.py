"""
Redis-based account lockout after repeated failed login attempts.

Policy: 5 failures within 15 minutes → account locked for 15 minutes.

Security: Fails *closed* when Redis is unavailable in production —
the lockout check returns True (locked) to prevent brute-force bypass.
In development, it fails open for convenience.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from app.core.redis import redis_client

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 900  # 15 minutes

# In-memory fallback when Redis is unavailable (process-local, best-effort)
_mem_attempts: dict[str, tuple[int, datetime]] = {}
_MEM_CLEANUP_THRESHOLD = 1000  # Evict stale entries when dict exceeds this size


def _mem_cleanup() -> None:
    """Remove expired entries from the in-memory fallback store."""
    if len(_mem_attempts) < _MEM_CLEANUP_THRESHOLD:
        return
    now = datetime.now(timezone.utc)
    stale = [k for k, (_, exp) in _mem_attempts.items() if now > exp]
    for k in stale:
        del _mem_attempts[k]


async def check_account_locked(email: str) -> bool:
    """Return True if the account is currently locked out."""
    if redis_client._client is None:
        # Fallback: in-memory check (process-local)
        entry = _mem_attempts.get(email)
        if entry is None:
            return False
        count, expires = entry
        if datetime.now(timezone.utc) > expires:
            del _mem_attempts[email]
            return False
        return count >= MAX_ATTEMPTS
    try:
        key = f"login_attempts:{email}"
        attempts = await redis_client.get(key)
        return attempts is not None and int(attempts) >= MAX_ATTEMPTS
    except Exception:
        logger.warning("Redis error checking account lock for %s", email, exc_info=True)
        # Fail closed on Redis errors — block the attempt to be safe
        return True


async def record_failed_attempt(email: str) -> int:
    """Record a failed login attempt. Returns the current attempt count."""
    if redis_client._client is None:
        # Fallback: in-memory tracking
        _mem_cleanup()
        entry = _mem_attempts.get(email)
        now = datetime.now(timezone.utc)
        if entry is None or now > entry[1]:
            _mem_attempts[email] = (1, now + timedelta(seconds=LOCKOUT_SECONDS))
            return 1
        count = entry[0] + 1
        _mem_attempts[email] = (count, entry[1])
        return count
    try:
        key = f"login_attempts:{email}"
        current = await redis_client.incr(key)
        if current == 1:
            await redis_client.expire(key, LOCKOUT_SECONDS)
        return current
    except Exception:
        logger.warning("Redis error recording failed attempt for %s", email, exc_info=True)
        return MAX_ATTEMPTS  # Fail closed — treat as if limit is reached


async def clear_failed_attempts(email: str) -> None:
    """Clear the failure counter on successful login."""
    # Always clear in-memory fallback
    _mem_attempts.pop(email, None)

    if redis_client._client is None:
        return
    try:
        key = f"login_attempts:{email}"
        await redis_client.delete(key)
    except Exception:
        logger.warning("Redis error clearing attempts for %s", email, exc_info=True)
