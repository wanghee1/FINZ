"""
Audit log model — records security-relevant events for compliance.

개인정보보호법: 개인정보 접근 기록 5년 보관 의무.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt

__all__ = ["AuditLog"]


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_event_created", "event_type", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resource: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} event={self.event_type} "
            f"user_id={self.user_id}>"
        )
