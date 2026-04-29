"""
Auth request / response schemas.

Covers signup, login, token refresh, and user representation
returned by auth endpoints.
"""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Requests ──────────────────────────────────────────────────────────────────

class ConsentItem(BaseModel):
    """Individual consent grant/withdrawal."""

    consent_type: Literal[
        "PRIVACY_POLICY", "TERMS_OF_SERVICE", "MARKETING", "PARTNER_SHARE"
    ]
    granted: bool
    version: str = Field(default="2026-01-01", max_length=20)


class SignupRequest(BaseModel):
    """Body for POST /auth/signup."""

    email: EmailStr
    password: str = Field(
        ...,
        min_length=10,
        max_length=128,
        description="10자 이상, 대/소문자·숫자·특수문자 각 1개 이상 포함",
    )

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        """비밀번호 복잡도 검증 (금융서비스 기준 강화)."""
        import re

        if not re.search(r"[a-z]", v):
            raise ValueError("소문자를 1개 이상 포함해야 합니다")
        if not re.search(r"[A-Z]", v):
            raise ValueError("대문자를 1개 이상 포함해야 합니다")
        if not re.search(r"\d", v):
            raise ValueError("숫자를 1개 이상 포함해야 합니다")
        if not re.search(r"[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/]", v):
            raise ValueError("특수문자를 1개 이상 포함해야 합니다")
        # Reject common weak passwords
        lower = v.lower()
        _COMMON_PASSWORDS = {
            "password123!", "qwerty12345", "abcdef1234",
            "p@ssword123", "admin12345", "welcome123",
            "123456789a", "password1!", "iloveyou123",
        }
        if lower in _COMMON_PASSWORDS:
            raise ValueError("너무 일반적인 비밀번호입니다. 다른 비밀번호를 사용해주세요")
        # Reject sequential/repeated patterns
        if re.search(r"(.)\1{3,}", v):
            raise ValueError("같은 문자를 4번 이상 연속 사용할 수 없습니다")
        return v

    name: str = Field(..., min_length=1, max_length=50)
    birth_date: date = Field(..., description="생년월일 (YYYY-MM-DD)")
    gender: Literal["M", "F"]
    phone: Optional[str] = Field(
        None,
        pattern=r"^01[016789]-?\d{3,4}-?\d{4}$",
        description="Korean mobile number, e.g. 010-1234-5678",
    )
    consents: list[ConsentItem] = Field(
        default_factory=list,
        description="List of consent grants (PRIVACY_POLICY and TERMS_OF_SERVICE required)",
    )

    @field_validator("consents")
    @classmethod
    def validate_required_consents(cls, v: list[ConsentItem]) -> list[ConsentItem]:
        """필수 동의 항목 검증."""
        granted_types = {c.consent_type for c in v if c.granted}
        required = {"PRIVACY_POLICY", "TERMS_OF_SERVICE"}
        missing = required - granted_types
        if missing:
            labels = {
                "PRIVACY_POLICY": "개인정보 처리방침",
                "TERMS_OF_SERVICE": "이용약관",
            }
            names = ", ".join(labels.get(m, m) for m in missing)
            raise ValueError(f"필수 동의가 필요합니다: {names}")
        return v


class LoginRequest(BaseModel):
    """Body for POST /auth/login."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Body for POST /auth/refresh."""

    refresh_token: str


class LogoutRequest(BaseModel):
    """Body for POST /auth/logout."""

    refresh_token: str


# ── Responses ─────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """JWT token pair returned on login and refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(
        ..., description="Access token lifetime in seconds"
    )


class UserResponse(BaseModel):
    """Public user representation returned by auth endpoints."""

    id: int
    email: str
    name: str
    birth_date: date
    gender: str
    phone: Optional[str] = None
    stage_index: int
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
