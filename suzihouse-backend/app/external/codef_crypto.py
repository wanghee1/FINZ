"""
CODEF RSA encryption utility.

Uses the CODEF-issued public key to encrypt sensitive data (e.g. passwords)
with RSA/ECB/PKCS1v15 padding, returned as Base64.
"""

from __future__ import annotations

import base64
import logging

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from app.config import settings

logger = logging.getLogger(__name__)


class CodefCrypto:
    """RSA encryption for CODEF API parameters."""

    def __init__(self) -> None:
        self._public_key: rsa.RSAPublicKey | None = None

    def _load_public_key(self) -> rsa.RSAPublicKey:
        """Load CODEF RSA public key from settings."""
        if self._public_key is not None:
            return self._public_key

        raw_key = settings.CODEF_PUBLIC_KEY
        if not raw_key:
            raise ValueError("CODEF_PUBLIC_KEY must be set in .env")

        # The key might be a raw base64 string or PEM format
        if "BEGIN PUBLIC KEY" in raw_key:
            pem_bytes = raw_key.encode()
        else:
            # Wrap raw base64 in PEM format
            pem_bytes = (
                b"-----BEGIN PUBLIC KEY-----\n"
                + raw_key.encode()
                + b"\n-----END PUBLIC KEY-----"
            )

        self._public_key = serialization.load_pem_public_key(pem_bytes)
        return self._public_key

    def encrypt(self, plain_text: str) -> str:
        """Encrypt plain text with RSA PKCS1v15 and return Base64 string.

        This is used for encrypting cert passwords and other sensitive
        fields required by CODEF APIs.
        """
        pub_key = self._load_public_key()
        encrypted = pub_key.encrypt(
            plain_text.encode("utf-8"),
            padding.PKCS1v15(),
        )
        return base64.b64encode(encrypted).decode("utf-8")


# Module-level singleton
codef_crypto = CodefCrypto()
