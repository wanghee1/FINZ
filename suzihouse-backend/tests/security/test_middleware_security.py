"""
Tests for security middleware configuration.
"""

from app.core.middleware import _mask_dict


class TestSensitiveFieldMasking:
    """Verify that sensitive fields are masked in logs."""

    def test_password_masked(self):
        result = _mask_dict({"password": "secret123", "email": "test@test.com"})
        assert result["password"] == "***"
        assert result["email"] == "test@test.com"

    def test_authorization_masked(self):
        result = _mask_dict({"authorization": "Bearer token123"})
        assert result["authorization"] == "***"

    def test_token_masked(self):
        result = _mask_dict({"token": "abc", "refresh_token": "def"})
        assert result["token"] == "***"
        assert result["refresh_token"] == "***"

    def test_api_key_masked(self):
        result = _mask_dict({"api_key": "key123", "name": "test"})
        assert result["api_key"] == "***"
        assert result["name"] == "test"

    def test_case_insensitive(self):
        result = _mask_dict({"Authorization": "Bearer x", "PASSWORD": "y"})
        assert result["Authorization"] == "***"
        assert result["PASSWORD"] == "***"

    def test_non_sensitive_unchanged(self):
        data = {"content-type": "application/json", "accept": "text/html"}
        result = _mask_dict(data)
        assert result == data
