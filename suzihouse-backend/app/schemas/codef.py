"""
CODEF 간편인증 관련 Request/Response 스키마.

프론트엔드 ↔ 백엔드 간 간편인증 흐름에 사용됩니다.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ═════════════════════════════════════════════════════════════════════════════
# 간편인증 시작
# ═════════════════════════════════════════════════════════════════════════════

class SimpleAuthStartRequest(BaseModel):
    """프론트엔드 → 백엔드: 간편인증 시작."""

    auth_provider: str = Field(
        ...,
        description="인증 수단: kakao, pass, toss, naver, samsung, kb, shinhan, banksalad, nh, woori",
    )
    user_name: str = Field(..., min_length=1, max_length=50)
    user_birth: str = Field(
        ...,
        pattern=r"^\d{8}$",
        description="생년월일 YYYYMMDD",
    )
    user_mobile: str = Field(
        ...,
        description="휴대폰번호 (하이픈 없이, 예: 01012345678)",
    )
    telecom: str = Field(
        "",
        description="통신사 (PASS인 경우 필수): 0=SKT, 1=KT, 2=LGU+",
    )

    @field_validator("user_mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        import re
        if not re.match(r"^01[016789]\d{7,8}$", v):
            raise ValueError("올바른 휴대폰 번호를 입력해주세요 (예: 01012345678)")
        return v


class SimpleAuthStartResponse(BaseModel):
    """백엔드 → 프론트엔드: 인증 세션 시작됨."""

    auth_request_id: str
    auth_provider: str
    status: str = "WAITING_2WAY"
    timeout_sec: int = 270
    polling_hint_sec: int = 3
    message: str = ""


# ═════════════════════════════════════════════════════════════════════════════
# 간편인증 확인 (폴링)
# ═════════════════════════════════════════════════════════════════════════════

class SimpleAuthConfirmRequest(BaseModel):
    """프론트엔드 → 백엔드: 인증 상태 확인."""

    auth_request_id: str


class SimpleAuthConfirmResponse(BaseModel):
    """백엔드 → 프론트엔드: 인증 상태."""

    auth_request_id: str
    status: str = Field(
        ...,
        description="WAITING_2WAY | VERIFIED | FAILED | EXPIRED",
    )
    verified_at: Optional[datetime] = None
    message: str = ""


# ═════════════════════════════════════════════════════════════════════════════
# 세금 데이터 수집 요청
# ═════════════════════════════════════════════════════════════════════════════

class TaxDataCollectRequest(BaseModel):
    """프론트엔드 → 백엔드: 인증 완료 후 세금 데이터 수집."""

    auth_request_id: str
    years: list[int] = Field(
        default=[2020, 2021, 2022, 2023, 2024],
        description="조회할 귀속연도 목록",
    )
    # 프로필 정보 (적격성 판정에 필요)
    employment_date: Optional[str] = Field(
        None,
        description="최초 중소기업 취업일 YYYYMMDD 또는 YYYY-MM-DD",
    )
    gender: Optional[str] = Field(
        None,
        description="성별: M 또는 F",
    )
    has_military: bool = Field(
        False,
        description="군복무 여부",
    )
    enlist_date: Optional[str] = Field(
        None,
        description="입대일 YYYYMMDD 또는 YYYY-MM-DD",
    )
    discharge_date: Optional[str] = Field(
        None,
        description="전역일 YYYYMMDD 또는 YYYY-MM-DD",
    )


# ── 계산 결과 인라인 (DB 저장 없이 응답에 직접 포함) ──

class YearResultInline(BaseModel):
    """연도별 계산 결과 (응답 전용, DB 저장 안 함)."""

    year: int
    # 소득 데이터 (CODEF에서 조회, DB 저장 안 함)
    total_salary: int = 0
    calculated_tax: int = 0
    wage_tax_credit_before_red: int = 0
    originally_reported_final_tax: int = 0
    reduction_applied: bool = False
    has_income_data: bool = True   # False면 해당 연도 소득 데이터 없음
    # 계산 결과
    annual_limit: int = 0
    raw_reduction: int = 0
    reduction_amount: int = 0
    wage_credit_after: int = 0
    corrected_final_tax: int = 0
    refund_income_tax: int = 0
    refund_local_tax: int = 0
    refund_total: int = 0
    calc_case: str = "SKIPPED"     # SIMPLE | COMPLEX | SKIPPED


class CalculationResultInline(BaseModel):
    """계산 결과 전체 (응답 전용, DB 저장 안 함)."""

    employment_type: str = "NONE"
    reduction_rate: float = 0.0
    total_estimated_refund: int = 0
    total_local_tax_refund: int = 0
    year_results: list[YearResultInline] = Field(default_factory=list)


class TaxDataCollectResponse(BaseModel):
    """백엔드 → 프론트엔드: 수집 + 계산 결과.

    CODEF 데이터는 DB에 저장하지 않고, 계산 결과만 응답에 포함합니다.
    사용자가 "저장" 버튼을 누를 때만 DB에 저장됩니다.
    """

    status: str
    message: str = ""
    data_years_found: int = Field(
        0,
        description="실제 소득 데이터가 조회된 연도 수",
    )
    no_income_years: list[int] = Field(
        default_factory=list,
        description="소득 데이터가 없는 연도 목록",
    )
    # 인라인 계산 결과 (DB 저장 안 함, 프론트엔드 표시 전용)
    calculation_result: Optional[CalculationResultInline] = None
