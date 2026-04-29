"""
User model -- central identity table for all FINZ users.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, Enum, Integer, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt, TimestampMixin
from app.models.enums import GenderEnum, RoleEnum

__all__ = ["User"]


class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(Enum(GenderEnum), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    stage_index: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum), nullable=False, server_default=RoleEnum.USER.value,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # noqa: F821
        "RefreshToken", back_populates="user", cascade="all, delete-orphan",
    )
    track1_profile: Mapped["Track1UserProfile | None"] = relationship(  # noqa: F821
        "Track1UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan",
    )
    track1_income_years: Mapped[list["Track1IncomeYear"]] = relationship(  # noqa: F821
        "Track1IncomeYear", back_populates="user", cascade="all, delete-orphan",
    )
    track1_calculations: Mapped[list["Track1Calculation"]] = relationship(  # noqa: F821
        "Track1Calculation", back_populates="user", cascade="all, delete-orphan",
    )
    track2_simulations: Mapped[list["Track2Simulation"]] = relationship(  # noqa: F821
        "Track2Simulation", back_populates="user", cascade="all, delete-orphan",
    )
    handoffs: Mapped[list["Handoff"]] = relationship(  # noqa: F821
        "Handoff", back_populates="user", cascade="all, delete-orphan",
    )
    notifications: Mapped[list["UserNotification"]] = relationship(  # noqa: F821
        "UserNotification", back_populates="user", cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
