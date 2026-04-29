"""
Handoff models -- tax-consultant referral workflow.

Tables:
- handoffs        : referral request header
- handoff_events  : event log for status transitions
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt
from app.models.enums import HandoffStatusEnum

__all__ = ["Handoff", "HandoffEvent"]


# ═════════════════════════════════════════════════════════════════════════════
# Handoff
# ═════════════════════════════════════════════════════════════════════════════

class Handoff(Base):
    __tablename__ = "handoffs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    handoff_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    calculation_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("track1_calculations.calculation_id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    consent_privacy: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    consent_partner: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[HandoffStatusEnum] = mapped_column(
        Enum(HandoffStatusEnum),
        nullable=False,
        server_default=HandoffStatusEnum.REQUESTED.value,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="handoffs")  # noqa: F821
    events: Mapped[list["HandoffEvent"]] = relationship(
        "HandoffEvent", back_populates="handoff", cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Handoff id={self.id} handoff_id={self.handoff_id!r} status={self.status}>"


# ═════════════════════════════════════════════════════════════════════════════
# HandoffEvent
# ═════════════════════════════════════════════════════════════════════════════

class HandoffEvent(Base):
    __tablename__ = "handoff_events"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    handoff_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("handoffs.handoff_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event: Mapped[str] = mapped_column(String(50), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    handoff: Mapped["Handoff"] = relationship("Handoff", back_populates="events")

    def __repr__(self) -> str:
        return f"<HandoffEvent id={self.id} handoff_id={self.handoff_id!r} event={self.event!r}>"
