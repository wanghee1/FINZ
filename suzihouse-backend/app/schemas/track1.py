"""
Track 1 – Youth Income Tax Refund schemas.

CODEF 인증 관련 스키마는 schemas/codef.py로 이동.
여기에는 기본정보 입력, 계산 결과, 이력, 저장 스키마를 유지합니다.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Basic Info Input ─────────────────────────────────────────────────────────

class Track1BasicInfoRequest(BaseModel):
    """User-supplied basic info for the Track 1 calculation."""

    birth_date: date
    gender: str = Field(..., pattern=r"^[MF]$")
    first_sme_hire_date: date
    military_served: bool
    enlist_date: Optional[date] = None
    discharge_date: Optional[date] = None


# ── Calculation Results ──────────────────────────────────────────────────────

class Track1YearResultResponse(BaseModel):
    """Per-year breakdown of a Track 1 calculation."""

    year: int
    annual_limit: int
    raw_reduction: int
    reduction_amount: int
    wage_credit_after: int
    corrected_final_tax: int
    refund_income_tax: int
    refund_local_tax: int
    refund_total: int
    calc_case: str

    # Raw income data (from CODEF / manual input)
    total_salary: int = 0
    calculated_tax: int = 0
    wage_tax_credit_before_red: int = 0
    originally_reported_final_tax: int = 0
    reduction_applied: bool = False


class Track1ResultResponse(BaseModel):
    """Full Track 1 calculation result."""

    calculation_id: str
    employment_type: str
    reduction_rate: float
    total_estimated_refund: int
    total_local_tax_refund: int
    year_results: List[Track1YearResultResponse]
    status: str
    calculated_at: Optional[datetime] = None


class Track1HistoryItem(BaseModel):
    """Summary row for the user's Track 1 calculation history."""

    calculation_id: str
    employment_type: str
    total_estimated_refund: int
    status: str
    created_at: datetime


# ── 시뮬레이션 결과 저장 요청 ─────────────────────────────────────────────────

class Track1YearResultSaveItem(BaseModel):
    """저장할 연도별 계산 결과."""

    year: int
    annual_limit: int = 0
    raw_reduction: int = 0
    reduction_amount: int = 0
    wage_credit_after: int = 0
    corrected_final_tax: int = 0
    refund_income_tax: int = 0
    refund_local_tax: int = 0
    refund_total: int = 0
    calc_case: str = "SKIPPED"


class Track1SaveResultRequest(BaseModel):
    """프론트엔드 → 백엔드: 시뮬레이션 결과 저장.

    사용자가 "저장하기" 버튼을 누를 때 호출됩니다.
    CODEF에서 가져온 소득 원시 데이터는 포함하지 않습니다.
    """

    auth_request_id: Optional[str] = Field(
        None,
        description="간편인증 요청 ID (자동 조회인 경우)",
    )
    employment_type: str = Field(
        ...,
        description="YOUTH | SENIOR | NONE",
    )
    reduction_rate: float = Field(
        ...,
        description="감면율 (예: 0.9, 0.7)",
    )
    total_estimated_refund: int = Field(
        ...,
        description="예상 소득세 환급 총액",
    )
    total_local_tax_refund: int = Field(
        0,
        description="예상 지방소득세 환급 총액",
    )
    year_results: List[Track1YearResultSaveItem] = Field(
        ...,
        description="연도별 계산 결과",
    )


class Track1SaveResultResponse(BaseModel):
    """백엔드 → 프론트엔드: 저장 완료."""

    calculation_id: str
    status: str = "SAVED"
    message: str = "시뮬레이션 결과가 저장되었습니다."
