"""
Track 2 models -- Property transfer tax simulation pipeline.

Tables:
- track2_simulations          : simulation header (per user)
- track2_inputs               : two-property input snapshot (1:1 with simulation)
- track2_realtrade_selections : real-trade price selections
- track2_calc_jobs            : calculation job lifecycle
- track2_results              : result header per job
- track2_scenarios            : per-scenario tax breakdown
- track2_ai_summaries         : AI-generated plain-language summaries
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt, TimestampMixin
from app.models.enums import (
    DoneeRelationEnum,
    SimulationStatusEnum,
    TargetEnum,
    TransferMethodEnum,
)

__all__ = [
    "Track2Simulation",
    "Track2Input",
    "Track2RealtradeSelection",
    "Track2CalcJob",
    "Track2Result",
    "Track2Scenario",
    "Track2AiSummary",
]


# ═════════════════════════════════════════════════════════════════════════════
# Track2Simulation
# ═════════════════════════════════════════════════════════════════════════════

class Track2Simulation(TimestampMixin, Base):
    __tablename__ = "track2_simulations"
    __table_args__ = (
        Index("ix_track2_simulations_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SimulationStatusEnum] = mapped_column(
        Enum(SimulationStatusEnum),
        nullable=False,
        server_default=SimulationStatusEnum.DRAFT.value,
    )
    policy_version: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="track2_simulations")  # noqa: F821
    input: Mapped["Track2Input | None"] = relationship(
        "Track2Input", back_populates="simulation", uselist=False, cascade="all, delete-orphan",
    )
    realtrade_selections: Mapped[list["Track2RealtradeSelection"]] = relationship(
        "Track2RealtradeSelection", back_populates="simulation", cascade="all, delete-orphan",
    )
    calc_jobs: Mapped[list["Track2CalcJob"]] = relationship(
        "Track2CalcJob", back_populates="simulation", cascade="all, delete-orphan",
    )
    results: Mapped[list["Track2Result"]] = relationship(
        "Track2Result", back_populates="simulation", cascade="all, delete-orphan",
    )
    ai_summaries: Mapped[list["Track2AiSummary"]] = relationship(
        "Track2AiSummary", back_populates="simulation", cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Track2Simulation id={self.id} simulation_id={self.simulation_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track2Input
# ═════════════════════════════════════════════════════════════════════════════

class Track2Input(TimestampMixin, Base):
    __tablename__ = "track2_inputs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track2_simulations.simulation_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # ── Property A ───────────────────────────────────────────────────────
    a_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    a_market_price: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    a_acquired_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    a_acquisition_price: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    a_is_regulated: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    # ── Property B ───────────────────────────────────────────────────────
    b_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    b_market_price: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    b_acquired_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    b_acquisition_price: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    b_is_regulated: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    # ── Financial ────────────────────────────────────────────────────────
    lease_deposit: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    loan_balance: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    b_lease_deposit: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    b_loan_balance: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")

    # ── Donee / Residency ────────────────────────────────────────────────
    donee_relation: Mapped[DoneeRelationEnum] = mapped_column(
        Enum(DoneeRelationEnum),
        nullable=False,
        server_default=DoneeRelationEnum.LINEAL_DESCENDANT_ADULT.value,
    )
    is_resident: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")

    # ── Relationships ────────────────────────────────────────────────────
    simulation: Mapped["Track2Simulation"] = relationship(
        "Track2Simulation", back_populates="input",
    )

    def __repr__(self) -> str:
        return f"<Track2Input id={self.id} simulation_id={self.simulation_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track2RealtradeSelection
# ═════════════════════════════════════════════════════════════════════════════

class Track2RealtradeSelection(Base):
    __tablename__ = "track2_realtrade_selections"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track2_simulations.simulation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target: Mapped[TargetEnum] = mapped_column(Enum(TargetEnum), nullable=False)
    trade_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    applied_price: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────
    simulation: Mapped["Track2Simulation"] = relationship(
        "Track2Simulation", back_populates="realtrade_selections",
    )

    def __repr__(self) -> str:
        return (
            f"<Track2RealtradeSelection id={self.id} "
            f"simulation_id={self.simulation_id!r} target={self.target}>"
        )


# ═════════════════════════════════════════════════════════════════════════════
# Track2CalcJob
# ═════════════════════════════════════════════════════════════════════════════

class Track2CalcJob(Base):
    __tablename__ = "track2_calc_jobs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track2_simulations.simulation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    policy_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    mode: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default="PRE_POST_COMPARE",
    )
    status: Mapped[str] = mapped_column(
        Enum("CALCULATING", "DONE", "FAILED", name="track2_calc_job_status"),
        nullable=False,
        server_default="CALCULATING",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    simulation: Mapped["Track2Simulation"] = relationship(
        "Track2Simulation", back_populates="calc_jobs",
    )

    def __repr__(self) -> str:
        return f"<Track2CalcJob id={self.id} job_id={self.job_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track2Result
# ═════════════════════════════════════════════════════════════════════════════

class Track2Result(Base):
    __tablename__ = "track2_results"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track2_simulations.simulation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("track2_calc_jobs.job_id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    base_scenario_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    policy_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    simulation: Mapped["Track2Simulation"] = relationship(
        "Track2Simulation", back_populates="results",
    )
    scenarios: Mapped[list["Track2Scenario"]] = relationship(
        "Track2Scenario", back_populates="result", cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Track2Result id={self.id} simulation_id={self.simulation_id!r}>"


# ═════════════════════════════════════════════════════════════════════════════
# Track2Scenario
# ═════════════════════════════════════════════════════════════════════════════

class Track2Scenario(Base):
    __tablename__ = "track2_scenarios"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    result_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("track2_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario_no: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target: Mapped[TargetEnum] = mapped_column(Enum(TargetEnum), nullable=False)
    method: Mapped[TransferMethodEnum] = mapped_column(
        Enum(TransferMethodEnum), nullable=False,
    )

    # ── Pre-policy tax columns ───────────────────────────────────────────
    pre_capital_gains_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    pre_gift_tax: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    pre_acquisition_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    pre_total: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")

    # ── Post-policy tax columns ──────────────────────────────────────────
    post_capital_gains_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    post_gift_tax: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    post_acquisition_tax: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )
    post_total: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")

    # ── Comparison ───────────────────────────────────────────────────────
    diff_from_base: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    surcharge_increase: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0",
    )

    # ── Relationships ────────────────────────────────────────────────────
    result: Mapped["Track2Result"] = relationship(
        "Track2Result", back_populates="scenarios",
    )

    def __repr__(self) -> str:
        return (
            f"<Track2Scenario id={self.id} result_id={self.result_id} "
            f"scenario_no={self.scenario_no}>"
        )


# ═════════════════════════════════════════════════════════════════════════════
# Track2AiSummary
# ═════════════════════════════════════════════════════════════════════════════

class Track2AiSummary(Base):
    __tablename__ = "track2_ai_summaries"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("track2_simulations.simulation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tone: Mapped[str] = mapped_column(String(20), nullable=False, server_default="SHORT")
    focus: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    simulation: Mapped["Track2Simulation"] = relationship(
        "Track2Simulation", back_populates="ai_summaries",
    )

    def __repr__(self) -> str:
        return f"<Track2AiSummary id={self.id} simulation_id={self.simulation_id!r}>"
