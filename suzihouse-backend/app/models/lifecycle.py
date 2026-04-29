"""
Lifecycle / policy reference models.

Tables:
- policy_versions  : versioned policy rule snapshots (JSON)
- regulated_areas  : regulated-area registry for Track 2 lookups
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, String, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt

__all__ = ["PolicyVersion", "RegulatedArea"]


# ═════════════════════════════════════════════════════════════════════════════
# PolicyVersion
# ═════════════════════════════════════════════════════════════════════════════

class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    policy_version: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
    )
    rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, server_default=func.now(), onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<PolicyVersion id={self.id} version={self.policy_version!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# RegulatedArea
# ═════════════════════════════════════════════════════════════════════════════

class RegulatedArea(Base):
    __tablename__ = "regulated_areas"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    region_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    region_name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    def __repr__(self) -> str:
        return (
            f"<RegulatedArea id={self.id} code={self.region_code!r} "
            f"name={self.region_name!r}>"
        )
