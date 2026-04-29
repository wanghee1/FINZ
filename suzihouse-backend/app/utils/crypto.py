"""
AES-256-GCM field-level encryption for PII (개인정보).

Provides encrypt/decrypt helpers for database column values.
Uses a derived key from the application SECRET_KEY via HKDF.

Usage::

    from app.utils.crypto import encrypt_pii, decrypt_pii

    encrypted = encrypt_pii("홍길동")
    original = decrypt_pii(encrypted)   # "홍길동"
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _derive_key(master_secret: str) -> bytes:
    """Derive a 256-bit AES key from the master secret via HKDF (NIST SP 800-56C).

    Uses the ``cryptography`` library's HKDF implementation for proper
    key derivation instead of bare SHA-256.
    """
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"suzihouse-pii-encryption-salt",
        info=b"AES-256-GCM-key",
    )
    return hkdf.derive(master_secret.encode("utf-8"))


def encrypt_pii(plaintext: str | None, secret_key: str | None = None) -> str | None:
    """Encrypt a plaintext PII value with AES-256-GCM.

    Returns a base64-encoded string of ``nonce || ciphertext || tag``.
    Returns ``None`` if *plaintext* is ``None`` or empty.
    """
    if not plaintext:
        return plaintext

    if secret_key is None:
        from app.config import settings
        secret_key = settings.SECRET_KEY

    key = _derive_key(secret_key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(key)

    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # nonce (12) + ciphertext + tag (16) — tag is appended by AESGCM
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_pii(encrypted: str | None, secret_key: str | None = None) -> str | None:
    """Decrypt a base64-encoded AES-256-GCM ciphertext back to plaintext.

    Returns ``None`` if *encrypted* is ``None`` or empty.
    Raises ``ValueError`` on tampered or invalid data.
    """
    if not encrypted:
        return encrypted

    if secret_key is None:
        from app.config import settings
        secret_key = settings.SECRET_KEY

    key = _derive_key(secret_key)
    raw = base64.urlsafe_b64decode(encrypted)

    if len(raw) < 12 + 16:
        raise ValueError("Invalid encrypted PII data (too short)")

    nonce = raw[:12]
    ciphertext = raw[12:]

    aesgcm = AESGCM(key)
    plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext_bytes.decode("utf-8")


def hash_pii_for_lookup(value: str, secret_key: str | None = None) -> str:
    """Create a deterministic HMAC-SHA256 hash for PII lookup (e.g. email search).

    This allows searching for a user by email without storing the email
    in plaintext, by comparing HMAC hashes.
    """
    if secret_key is None:
        from app.config import settings
        secret_key = settings.SECRET_KEY

    return hmac.new(
        f"pii-lookup-key:{secret_key}".encode(),
        value.lower().strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
