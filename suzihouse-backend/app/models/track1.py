"""
Track 1 models -- Youth / Senior income-tax refund calculation pipeline.

Tables:
- track1_auth_requests   : third-party auth (e.g. HomeTax) session tracking
- track1_collect_jobs    : data-collection job lifecycle
- track1_user_profiles   : user demographic + employment snapshot for calc
- track1_income_years    : per-year income data (auto or manual)
- track1_calculations    : calculation job header
- track1_year_results    : per-year refund result rows
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt, TimestampMixin
from app.models.enums import (
    AuthProcessStatusEnum,
    CalcCaseEnum,
    CalcStatusEnum,
    CollectJobStatusEnum,
    EmploymentTypeEnum,
    GenderEnum,
    IncomeDataSourceEnum,
    SimpleAuthProviderEnum,
)

__all__ = [
    "Track1AuthRequest",
    "Track1CollectJob",
    "Track1UserProfile",
    "Track1IncomeYear",
    "Track1Calculation",
    "Track1YearResult",
]


# ═════════════════════════════════════════════════════════════════════════════
# Track1AuthRequest
# ═════════════════════════════════════════════════════════════════════════════

class Track1AuthRequest(Base):
    __tablename__ = "track1_auth_requests"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    auth_request_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    organization: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="hometax",
    )
    login_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    auth_provider: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="간편인증 수단 (kakao, toss, pass 등)",
    )
    login_type_level: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="CODEF loginTypeLevel 코드",
    )
    user_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_birth: Mapped[str | None] = mapped_column(String(8), nullable=True)
    user_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telecom: Mapped[str | None] = mapped_column(
        String(5), nullable=True, comment="통신사 코드 (PASS용)",
    )
    codef_session_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="CODEF id (SSO 식별값)",
    )
    job_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thread_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    two_way_jti: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="2WAY jti",
    )
    two_way_timestamp: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, comment="2WAY twoWayTimestamp",
    )
    external_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    process_status: Mapped[AuthProcessStatusEnum] = mapped_column(
        Enum(AuthProcessStatusEnum),
        nullable=False,
        server_default=AuthProcessStatusEnum.PENDING.value,
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    two_way_timeout_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="2WAY 타임아웃 시각",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<Track1AuthRequest id={self.id} auth_request_id={self.auth_request_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track1CollectJob
# ═════════════════════════════════════════════════════════════════════════════

class Track1CollectJob(Base):
    __tablename__ = "track1_collect_jobs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    collect_job_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
    )
    auth_request_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("track1_auth_requests.auth_request_id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    years: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    include_types: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[CollectJobStatusEnum] = mapped_column(
        Enum(CollectJobStatusEnum),
        nullable=False,
        server_default=CollectJobStatusEnum.COLLECTING.value,
    )
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Track1CollectJob id={self.id} collect_job_id={self.collect_job_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track1UserProfile
# ═════════════════════════════════════════════════════════════════════════════

class Track1UserProfile(TimestampMixin, Base):
    __tablename__ = "track1_user_profiles"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False,
    )
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(Enum(GenderEnum), nullable=True)
    first_sme_hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    military_served: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    enlist_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    discharge_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    military_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    employment_type: Mapped[EmploymentTypeEnum] = mapped_column(
        Enum(EmploymentTypeEnum),
        nullable=False,
        server_default=EmploymentTypeEnum.NONE.value,
    )
    tax_age: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="track1_profile")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Track1UserProfile id={self.id} user_id={self.user_id}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track1IncomeYear
# ═════════════════════════════════════════════════════════════════════════════

class Track1IncomeYear(Base):
    __tablename__ = "track1_income_years"
    __table_args__ = (
        UniqueConstraint("user_id", "year", name="uq_track1_income_years_user_year"),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    calculation_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("track1_calculations.calculation_id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    is_eligible_year: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    is_sme_year: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    total_salary: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    salary_from_sme: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    earned_income_amount: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    other_income_amount: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    global_income_tax_base: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    calculated_tax: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    wage_tax_credit_before_red: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    originally_reported_reduction: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    originally_reported_final_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    data_source: Mapped[IncomeDataSourceEnum] = mapped_column(
        Enum(IncomeDataSourceEnum),
        nullable=False,
        server_default=IncomeDataSourceEnum.AUTO.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="track1_income_years")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Track1IncomeYear id={self.id} user_id={self.user_id} year={self.year}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track1Calculation
# ═════════════════════════════════════════════════════════════════════════════

class Track1Calculation(Base):
    __tablename__ = "track1_calculations"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    calculation_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    auth_request_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("track1_auth_requests.auth_request_id", ondelete="SET NULL"),
        nullable=True,
    )
    employment_type: Mapped[EmploymentTypeEnum] = mapped_column(
        Enum(EmploymentTypeEnum), nullable=False,
    )
    reduction_rate: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    total_estimated_refund: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    total_local_tax_refund: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    status: Mapped[CalcStatusEnum] = mapped_column(
        Enum(CalcStatusEnum),
        nullable=False,
        server_default=CalcStatusEnum.CALCULATING.value,
    )
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="track1_calculations")  # noqa: F821
    year_results: Mapped[list["Track1YearResult"]] = relationship(
        "Track1YearResult",
        back_populates="calculation",
        cascade="all, delete-orphan",
        foreign_keys="Track1YearResult.calculation_id",
        primaryjoin="Track1Calculation.calculation_id == Track1YearResult.calculation_id",
    )

    def __repr__(self) -> str:
        return f"<Track1Calculation id={self.id} calculation_id={self.calculation_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track1YearResult
# ═════════════════════════════════════════════════════════════════════════════

class Track1YearResult(Base):
    __tablename__ = "track1_year_results"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    calculation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track1_calculations.calculation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    annual_limit: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    raw_reduction: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    reduction_amount: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    wage_credit_after: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    corrected_final_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    refund_income_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    refund_local_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    refund_total: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    calc_case: Mapped[CalcCaseEnum | None] = mapped_column(
        Enum(CalcCaseEnum), nullable=True,
    )

    # ── Relationships ────────────────────────────────────────────────────
    calculation: Mapped["Track1Calculation"] = relationship(
        "Track1Calculation",
        back_populates="year_results",
        foreign_keys=[calculation_id],
    )

    def __repr__(self) -> str:
        return (
            f"<Track1YearResult id={self.id} "
            f"calculation_id={self.calculation_id!r} year={self.year}>"
        )
