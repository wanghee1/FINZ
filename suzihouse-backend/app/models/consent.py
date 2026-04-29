"""
ConsentLog model -- tracks user consent for personal data processing.

개인정보보호법 §15, §17: 개인정보 수집·이용 동의 기록 보관.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt

__all__ = ["ConsentLog"]


class ConsentLog(Base):
    __tablename__ = "consent_logs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    consent_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="PRIVACY_POLICY | TERMS_OF_SERVICE | MARKETING | PARTNER_SHARE",
    )
    version: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="Policy version at time of consent (e.g. '2026-01-01')",
    )
    granted: Mapped[bool] = mapped_column(
        Boolean, nullable=False,
        comment="True=granted, False=withdrawn",
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detail: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Additional context (e.g. withdrawal reason)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    def __repr__(self) -> str:
        return (
            f"<ConsentLog id={self.id} user_id={self.user_id} "
            f"type={self.consent_type} granted={self.granted}>"
        )
