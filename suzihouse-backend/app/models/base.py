"""
Shared base utilities for all ORM models.

Re-exports the declarative Base from app.core.database and provides
TimestampMixin for automatic created_at / updated_at columns.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# BigInteger that falls back to Integer on SQLite (required for autoincrement)
BigInt = BigInteger().with_variant(Integer, "sqlite")

__all__ = ["Base", "BigInt", "TimestampMixin"]


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=func.now(),
        onupdate=func.now(),
    )
