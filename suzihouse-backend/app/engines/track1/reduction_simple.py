"""
Track 1 - Simple (Case A) tax reduction calculation.

Case A applies when the taxpayer has:
  - Only earned income (no other income: other_income_amount == 0)
  - All salary from the qualifying SME (salary_from_sme == total_salary)

Formula:
  Step 1: raw_reduction = calculated_tax * reduction_rate
  Step 2: limit = annual limit (1,500,000 or 2,000,000 depending on year)
  Step 3: reduction = min(raw_reduction, limit)
  Step 4: wage_credit_after = wage_credit_before * (1 - reduction / calculated_tax)
          (If calculated_tax == 0, wage_credit_after = 0)
  Step 5: other_credits = calculated_tax - orig_reduction - wage_credit_before - orig_final_tax
          (표준세액공제, 자녀세액공제 등 감면과 무관한 고정 세액공제)
  Step 6: corrected_final_tax = max(0, calculated_tax - reduction - wage_credit_after - other_credits)

All amounts in won (원). Uses integer arithmetic for money.
"""

import math
from dataclasses import dataclass

from app.engines.common.tax_rates import get_annual_limit


@dataclass
class InputYearData:
    """Input data for a single tax year's reduction calculation."""

    year: int
    reduction_rate: float  # 감면율 (0.9 or 0.7)
    calculated_tax: int  # 산출세액
    wage_tax_credit_before_red: int  # 감면전 근로소득세액공제
    originally_reported_reduction: int  # 당초 감면세액 (original filing)
    originally_reported_final_tax: int  # 당초 결정세액 (original filing)
    total_salary: int = 0  # 총급여
    salary_from_sme: int = 0  # 중소기업 급여
    earned_income_amount: int = 0  # 근로소득금액
    other_income_amount: int = 0  # 기타소득금액 (종합소득 중 근로소득 외)


@dataclass
class ReductionResult:
    """Result of a single year's reduction calculation."""

    raw_reduction: int  # 감면세액 (before limit)
    annual_limit: int  # 연간 한도
    reduction_amount: int  # 실제 감면세액 = min(raw, limit)
    wage_credit_after: int  # 재조정 근로소득세액공제
    corrected_final_tax: int  # 경정 결정세액
    calc_case: str  # "SIMPLE" or "COMPLEX"


def compute_reduction_simple(data: InputYearData) -> ReductionResult:
    """
    Compute the tax reduction using the simple (Case A) method.

    This method applies when the taxpayer's income is entirely from
    a single qualifying SME (no other income sources).

    Args:
        data: InputYearData with the year's tax details.

    Returns:
        ReductionResult with the computed reduction and adjusted figures.
    """
    calculated_tax = data.calculated_tax

    # Step 1: Raw reduction amount
    raw_reduction = math.floor(calculated_tax * data.reduction_rate)

    # Step 2: Annual limit
    annual_limit = get_annual_limit(data.year)

    # Step 3: Capped reduction
    reduction_amount = min(raw_reduction, annual_limit)

    # Step 4: Adjusted wage tax credit
    if calculated_tax > 0:
        # wage_credit_after = wage_credit_before * (1 - reduction / calculated_tax)
        # Use precise calculation then floor to integer
        adjustment_ratio = 1.0 - (reduction_amount / calculated_tax)
        wage_credit_after = math.floor(
            data.wage_tax_credit_before_red * adjustment_ratio
        )
        wage_credit_after = max(wage_credit_after, 0)
    else:
        wage_credit_after = 0

    # Step 5: Other fixed tax credits (표준세액공제, 자녀세액공제 등)
    # 감면이 변해도 바뀌지 않는 세액공제를 원래 신고 데이터에서 역산
    # 산출세액 = 감면 + 근로소득세액공제 + 기타세액공제 + 결정세액
    other_credits = max(
        0,
        calculated_tax
        - data.originally_reported_reduction
        - data.wage_tax_credit_before_red
        - data.originally_reported_final_tax,
    )

    # Step 6: Corrected final tax (기타세액공제 포함)
    corrected_final_tax = max(
        0, calculated_tax - reduction_amount - wage_credit_after - other_credits
    )

    return ReductionResult(
        raw_reduction=raw_reduction,
        annual_limit=annual_limit,
        reduction_amount=reduction_amount,
        wage_credit_after=wage_credit_after,
        corrected_final_tax=corrected_final_tax,
        calc_case="SIMPLE",
    )
