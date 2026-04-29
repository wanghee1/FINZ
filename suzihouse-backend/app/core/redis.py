"""
Redis client with lazy connection and lifecycle helpers.

Provides:
- RedisClient class with common operations
- get_redis() dependency for FastAPI
- init_redis() / close_redis() for app startup/shutdown
"""

from __future__ import annotations

import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Thin async wrapper around redis.asyncio with lazy initialisation."""

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    # ── Connection lifecycle ─────────────────────────────────────────────

    async def connect(self) -> None:
        """Create the underlying Redis connection pool."""
        if self._client is not None:
            return
        client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
        # Verify connectivity — if ping fails, _client stays None
        await client.ping()
        self._client = client
        logger.info("Redis connection established (%s)", settings.REDIS_URL)

    async def disconnect(self) -> None:
        """Gracefully close the Redis connection pool."""
        if self._client is None:
            return
        await self._client.aclose()
        self._client = None
        logger.info("Redis connection closed")

    @property
    def client(self) -> aioredis.Redis:
        """Return the active client, raising if not connected."""
        if self._client is None:
            raise RuntimeError(
                "Redis client is not connected. Call connect() first."
            )
        return self._client

    # ── Common operations ────────────────────────────────────────────────

    async def get(self, key: str) -> str | None:
        """Get a value by key. Returns None if the key does not exist."""
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> bool:
        """
        Set a key to a value.

        Parameters
        ----------
        key : str
            The Redis key.
        value : Any
            The value to store (will be serialised to string by redis-py).
        ttl : int | None
            Optional time-to-live in seconds.
        """
        if ttl is not None:
            return await self.client.set(key, value, ex=ttl)
        return await self.client.set(key, value)

    async def delete(self, key: str) -> int:
        """Delete a key. Returns the number of keys removed (0 or 1)."""
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check whether a key exists."""
        return bool(await self.client.exists(key))

    async def incr(self, key: str) -> int:
        """Atomically increment a key's integer value by 1."""
        return await self.client.incr(key)

    async def expire(self, key: str, ttl: int) -> bool:
        """Set a TTL (in seconds) on an existing key."""
        return await self.client.expire(key, ttl)


# ── Module-level singleton ───────────────────────────────────────────────────
redis_client = RedisClient()


# ── FastAPI dependency ───────────────────────────────────────────────────────
async def get_redis() -> RedisClient:
    """
    FastAPI dependency that returns the shared RedisClient instance.

    Usage::

        @router.get("/cached")
        async def cached_endpoint(redis: RedisClient = Depends(get_redis)):
            value = await redis.get("my_key")
            ...
    """
    return redis_client


# ── App lifecycle hooks ──────────────────────────────────────────────────────
async def init_redis() -> None:
    """Call during app startup (lifespan)."""
    await redis_client.connect()


async def close_redis() -> None:
    """Call during app shutdown (lifespan)."""
    await redis_client.disconnect()
