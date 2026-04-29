"""
Tests for AES-256-GCM PII encryption utility.
"""

import pytest

from app.utils.crypto import decrypt_pii, encrypt_pii, hash_pii_for_lookup

TEST_SECRET = "test-secret-key-for-unit-tests-only"


class TestEncryptPII:
    """encrypt_pii / decrypt_pii round-trip tests."""

    def test_roundtrip_korean(self):
        original = "홍길동"
        encrypted = encrypt_pii(original, secret_key=TEST_SECRET)
        assert encrypted != original
        assert decrypt_pii(encrypted, secret_key=TEST_SECRET) == original

    def test_roundtrip_email(self):
        original = "user@example.com"
        encrypted = encrypt_pii(original, secret_key=TEST_SECRET)
        assert decrypt_pii(encrypted, secret_key=TEST_SECRET) == original

    def test_roundtrip_phone(self):
        original = "010-1234-5678"
        encrypted = encrypt_pii(original, secret_key=TEST_SECRET)
        assert decrypt_pii(encrypted, secret_key=TEST_SECRET) == original

    def test_none_returns_none(self):
        assert encrypt_pii(None, secret_key=TEST_SECRET) is None
        assert decrypt_pii(None, secret_key=TEST_SECRET) is None

    def test_empty_returns_empty(self):
        assert encrypt_pii("", secret_key=TEST_SECRET) == ""
        assert decrypt_pii("", secret_key=TEST_SECRET) == ""

    def test_different_keys_fail(self):
        encrypted = encrypt_pii("secret", secret_key=TEST_SECRET)
        with pytest.raises(Exception):
            decrypt_pii(encrypted, secret_key="wrong-key")

    def test_each_encryption_unique(self):
        """Each call produces a different ciphertext (random nonce)."""
        text = "same input"
        enc1 = encrypt_pii(text, secret_key=TEST_SECRET)
        enc2 = encrypt_pii(text, secret_key=TEST_SECRET)
        assert enc1 != enc2
        # But both decrypt to the same value
        assert decrypt_pii(enc1, secret_key=TEST_SECRET) == text
        assert decrypt_pii(enc2, secret_key=TEST_SECRET) == text

    def test_tampered_data_fails(self):
        encrypted = encrypt_pii("data", secret_key=TEST_SECRET)
        # Flip a character in the middle
        tampered = encrypted[:10] + ("A" if encrypted[10] != "A" else "B") + encrypted[11:]
        with pytest.raises(Exception):
            decrypt_pii(tampered, secret_key=TEST_SECRET)

    def test_too_short_data_raises(self):
        with pytest.raises(ValueError, match="too short"):
            decrypt_pii("dG9vc2hvcnQ=", secret_key=TEST_SECRET)


class TestHashPII:
    """hash_pii_for_lookup tests."""

    def test_deterministic(self):
        h1 = hash_pii_for_lookup("test@example.com", secret_key=TEST_SECRET)
        h2 = hash_pii_for_lookup("test@example.com", secret_key=TEST_SECRET)
        assert h1 == h2

    def test_case_insensitive(self):
        h1 = hash_pii_for_lookup("Test@Example.COM", secret_key=TEST_SECRET)
        h2 = hash_pii_for_lookup("test@example.com", secret_key=TEST_SECRET)
        assert h1 == h2

    def test_different_values_different_hashes(self):
        h1 = hash_pii_for_lookup("alice@test.com", secret_key=TEST_SECRET)
        h2 = hash_pii_for_lookup("bob@test.com", secret_key=TEST_SECRET)
        assert h1 != h2

    def test_different_keys_different_hashes(self):
        h1 = hash_pii_for_lookup("user@test.com", secret_key="key-a")
        h2 = hash_pii_for_lookup("user@test.com", secret_key="key-b")
        assert h1 != h2

    def test_hash_length(self):
        h = hash_pii_for_lookup("test@example.com", secret_key=TEST_SECRET)
        assert len(h) == 64  # SHA-256 hex digest
