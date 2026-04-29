"""
Tests for password complexity validation.
"""

import pytest
from pydantic import ValidationError

from app.schemas.auth import SignupRequest


class TestPasswordComplexity:
    """Verify Pydantic password validator enforces policy."""

    def _build(self, password: str) -> dict:
        return {
            "email": "test@example.com",
            "password": password,
            "name": "Test",
            "birth_date": "1995-01-15",
            "gender": "M",
        }

    def test_valid_password(self):
        req = SignupRequest(**self._build("StrongP@ss1"))
        assert req.password == "StrongP@ss1"

    def test_too_short(self):
        with pytest.raises(ValidationError, match="10"):
            SignupRequest(**self._build("Ab1!xyzAb"))

    def test_no_lowercase(self):
        with pytest.raises(ValidationError, match="소문자"):
            SignupRequest(**self._build("UPPERCASE1!"))

    def test_no_uppercase(self):
        with pytest.raises(ValidationError, match="대문자"):
            SignupRequest(**self._build("lowercase1!"))

    def test_no_digit(self):
        with pytest.raises(ValidationError, match="숫자"):
            SignupRequest(**self._build("NoDigits!!Ab"))

    def test_no_special_char(self):
        with pytest.raises(ValidationError, match="특수문자"):
            SignupRequest(**self._build("NoSpecial1Ab"))

    def test_max_length(self):
        long_pw = "Aa1!" + "x" * 125  # 129 chars, max is 128
        with pytest.raises(ValidationError):
            SignupRequest(**self._build(long_pw))

    def test_at_max_length(self):
        # Use alternating chars to avoid 4+ consecutive identical character rule
        filler = "xYzW" * 31  # 124 chars of non-repeating pattern
        pw = "Aa1!" + filler[:124]  # exactly 128 chars
        req = SignupRequest(**self._build(pw))
        assert len(req.password) == 128
