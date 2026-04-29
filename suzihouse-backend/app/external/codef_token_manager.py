"""
CODEF OAuth 2.0 Token Manager.

Handles access token issuance, caching (in-memory + Redis), and auto-renewal.
Access tokens are valid for 7 days; we cache for 6 days.
"""

from __future__ import annotations

import base64
import logging
import time
from urllib.parse import unquote

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Token TTL: 6 days (leave 1 day buffer before 7-day expiry)
_TOKEN_TTL_SECONDS = 6 * 24 * 3600
_OAUTH_URL = "https://oauth.codef.io/oauth/token"


class CodefTokenManager:
    """Manages CODEF API access tokens with in-memory caching."""

    def __init__(self) -> None:
        self._cached_token: str | None = None
        self._token_expires_at: float = 0.0

    async def get_token(self) -> str:
        """Return a valid access token, issuing a new one if needed."""
        if self._cached_token and time.time() < self._token_expires_at:
            return self._cached_token

        token = await self._issue_token()
        self._cached_token = token
        self._token_expires_at = time.time() + _TOKEN_TTL_SECONDS
        logger.info("CODEF access token issued/refreshed")
        return token

    async def _issue_token(self) -> str:
        """Request a new access token from CODEF OAuth endpoint.

        POST https://oauth.codef.io/oauth/token
        Authorization: Basic base64(client_id:client_secret)
        Content-Type: application/x-www-form-urlencoded
        Body: grant_type=client_credentials&scope=read
        """
        client_id = settings.CODEF_CLIENT_ID
        client_secret = settings.CODEF_CLIENT_SECRET

        if not client_id or not client_secret:
            raise ValueError(
                "CODEF_CLIENT_ID and CODEF_CLIENT_SECRET must be set in .env"
            )

        # Basic auth: base64(client_id:client_secret)
        auth_str = f"{client_id}:{client_secret}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _OAUTH_URL,
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                content="grant_type=client_credentials&scope=read",
            )
            resp.raise_for_status()

            # Response is URL-encoded JSON
            body_text = unquote(resp.text)
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else __import__("json").loads(body_text)

        token = data.get("access_token")
        if not token:
            logger.error("CODEF token response missing access_token: %s", data)
            raise RuntimeError("Failed to obtain CODEF access token")

        return token

    def invalidate(self) -> None:
        """Force token refresh on next call."""
        self._cached_token = None
        self._token_expires_at = 0.0


# Module-level singleton
codef_token_manager = CodefTokenManager()
