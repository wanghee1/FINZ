"""
Track 2 – Property Transfer Tax Simulation schemas.

Covers simulation CRUD, property input, real-trade lookup,
multi-scenario calculation results, and AI summary.
"""

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ── Simulation CRUD ──────────────────────────────────────────────────────────

class SimulationCreateRequest(BaseModel):
    """Create a new Track 2 simulation."""

    title: Optional[str] = Field(
        None, max_length=100, description="User-friendly label"
    )


class SimulationResponse(BaseModel):
    """Simulation metadata."""

    simulation_id: str
    title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


# ── Property Input ───────────────────────────────────────────────────────────

class Track2InputUpdate(BaseModel):
    """Partial update for property A / B input data."""

    # Property A
    a_address: Optional[str] = None
    a_market_price: Optional[int] = None
    a_acquired_at: Optional[date] = None
    a_acquisition_price: Optional[int] = None
    a_is_regulated: Optional[bool] = None

    # Property B
    b_address: Optional[str] = None
    b_market_price: Optional[int] = None
    b_acquired_at: Optional[date] = None
    b_acquisition_price: Optional[int] = None
    b_is_regulated: Optional[bool] = None

    # Financial
    lease_deposit: Optional[int] = None
    loan_balance: Optional[int] = None
    b_lease_deposit: Optional[int] = None
    b_loan_balance: Optional[int] = None

    # Transfer context
    donee_relation: Optional[str] = None
    is_resident: Optional[bool] = None


class Track2InputResponse(BaseModel):
    """Full snapshot of property input data."""

    a_address: Optional[str] = None
    a_market_price: Optional[int] = None
    a_acquired_at: Optional[date] = None
    a_acquisition_price: Optional[int] = None
    a_is_regulated: Optional[bool] = None

    b_address: Optional[str] = None
    b_market_price: Optional[int] = None
    b_acquired_at: Optional[date] = None
    b_acquisition_price: Optional[int] = None
    b_is_regulated: Optional[bool] = None

    lease_deposit: Optional[int] = None
    loan_balance: Optional[int] = None
    b_lease_deposit: Optional[int] = None
    b_loan_balance: Optional[int] = None

    donee_relation: Optional[str] = None
    is_resident: Optional[bool] = None


# ── Real-trade Lookup ────────────────────────────────────────────────────────

class RealtradeQuery(BaseModel):
    """Query parameters for the MOLIT real-trade API."""

    lawd_cd: str = Field(..., description="Legal area code (5 digits)")
    deal_ymd: str = Field(..., description="YYYYMM deal period")


class RealtradeItem(BaseModel):
    """Single real-trade record."""

    trade_id: str
    apt_name: str
    area: float
    area_pyeong: float = 0.0
    deal_amount: int
    deal_amount_display: str = ""
    floor: int
    deal_date: str
    umd_nm: str = ""
    jibun: str = ""
    road_nm: str = ""
    build_year: str = ""
    is_canceled: bool = False
    dealing_type: str = ""
    apt_dong: str = ""
    apt_seq: str = ""


class RealtradeSelectRequest(BaseModel):
    """Apply a real-trade record as a property price."""

    target: Literal["A", "B"]
    trade_id: str
    applied_price: int


# ── Apartment Search ────────────────────────────────────────────────────────

class ApartmentTradeItem(BaseModel):
    """Single trade within an apartment group."""

    trade_id: str
    area: float
    area_pyeong: float
    deal_amount: int
    deal_amount_display: str
    floor: int
    deal_date: str
    is_canceled: bool = False
    dealing_type: str = ""
    apt_dong: str = ""


class ApartmentGroup(BaseModel):
    """Grouped apartment with trade summary."""

    apt_name: str
    trade_count: int
    areas: List[str]
    min_price: int
    max_price: int
    min_price_display: str
    max_price_display: str
    latest_trade_date: str
    build_year: str = ""
    umd_nm: str = ""
    road_nm: str = ""
    trades: List[ApartmentTradeItem]


class ApartmentSearchResponse(BaseModel):
    """Response for apartment search."""

    apartments: List[ApartmentGroup]
    total_trades: int
    filtered_trades: int
    period: str


class RegionItem(BaseModel):
    """Single region entry."""

    sido: str
    name: str
    code: str


# ── Calculation ──────────────────────────────────────────────────────────────

class CalculateRequest(BaseModel):
    """Trigger a Track 2 multi-scenario calculation."""

    policy_date: Optional[date] = Field(
        None, description="Reference date for tax-rate lookup"
    )


class ScenarioResult(BaseModel):
    """One scenario row in the comparison matrix."""

    scenario_no: int
    label: str
    target: str
    method: str

    # Pre-policy figures
    pre_capital_gains_tax: int
    pre_gift_tax: int
    pre_acquisition_tax: int
    pre_total: int

    # Post-policy figures
    post_capital_gains_tax: int
    post_gift_tax: int
    post_acquisition_tax: int
    post_total: int

    diff_from_base: int
    surcharge_increase: int


class Track2ResultResponse(BaseModel):
    """Full Track 2 calculation result with ranked scenarios."""

    simulation_id: str
    scenarios: List[ScenarioResult]
    rank_pre: List[int]
    rank_post: List[int]
    optimal_pre: int
    optimal_post: int
    risk_delta: int
    calculated_at: datetime


# ── AI Summary ───────────────────────────────────────────────────────────────

class AiSummaryRequest(BaseModel):
    """Request an AI-generated summary of the simulation result."""

    tone: str = Field(
        default="SHORT",
        description="Summary style: SHORT, DETAILED, FRIENDLY",
    )
    focus: Optional[List[int]] = Field(
        None, description="Scenario numbers to focus on"
    )


class AiSummaryResponse(BaseModel):
    """AI-generated text summary."""

    text: str
    generated_at: datetime
