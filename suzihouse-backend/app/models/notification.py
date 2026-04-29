"""
UserNotification model -- per-user notification preferences.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt
from app.models.enums import NotificationTypeEnum

__all__ = ["UserNotification"]


class UserNotification(Base):
    __tablename__ = "user_notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "type", name="uq_user_notifications_user_type"),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    type: Mapped[NotificationTypeEnum] = mapped_column(
        Enum(NotificationTypeEnum), nullable=False,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="notifications")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<UserNotification id={self.id} user_id={self.user_id} "
            f"type={self.type} enabled={self.enabled}>"
        )
