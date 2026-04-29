"""
Track 1 - Employment type eligibility determination.

Determines whether an individual qualifies as a 청년 (youth) or 고령자 (senior)
for the SME income tax reduction program, and calculates the exemption period
and eligible years within the rectification window (2020-2024).
"""

from dataclasses import dataclass, field
from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Optional

from app.engines.common.constants import (
    RECTIFICATION_BASE_YEAR,
    RECTIFICATION_END_YEAR,
    SENIOR_AGE_MIN,
    SENIOR_EXEMPTION_YEARS,
    SENIOR_REDUCTION_RATE,
    YOUTH_AGE_MAX,
    YOUTH_AGE_MIN,
    YOUTH_EXEMPTION_YEARS,
    YOUTH_REDUCTION_RATE,
)
from app.engines.track1.tax_age import calc_age, calc_tax_age


@dataclass
class EligibilityResult:
    """Result of eligibility determination."""

    employment_type: str  # "YOUTH", "SENIOR", "NONE"
    reduction_rate: float  # 0.9, 0.7, or 0.0
    exemption_years: int  # 5, 3, or 0
    exemption_start: Optional[date]  # Start of exemption period (inclusive)
    exemption_end: Optional[date]  # End of exemption period (inclusive)
    eligible_years: dict[int, bool] = field(
        default_factory=dict
    )  # {2020: True, 2021: False, ...}
    reason: str = ""  # 판정 사유 (explanation)


def judge_eligibility(
    birth_date: date,
    gender: str,
    first_sme_hire_date: date,
    military_months: int = 0,
    tax_age: Optional[float] = None,
) -> EligibilityResult:
    """
    Determine eligibility for the SME employment income tax reduction.

    Decision logic:
      1. Calculate tax_age if not provided (using military deduction for males).
      2. If YOUTH_AGE_MIN (15) <= tax_age <= YOUTH_AGE_MAX (34):
         -> YOUTH: 90% reduction rate, 5-year exemption period.
      3. Else if 만 나이 (actual age) >= SENIOR_AGE_MIN (60):
         -> SENIOR: 70% reduction rate, 3-year exemption period.
      4. Else:
         -> NONE: not eligible.
      5. Calculate exemption period: hire_date to hire_date + exemption_years - 1 day.
      6. For each year in the rectification window (2020-2024), determine if the
         year falls within the exemption period.

    Args:
        birth_date: Date of birth.
        gender: "M" for male, "F" for female.
        first_sme_hire_date: Date of first employment at a qualifying SME.
        military_months: Military service duration in months (default 0).
        tax_age: Pre-calculated tax-law age. If None, calculated automatically.

    Returns:
        EligibilityResult with all eligibility details.
    """
    # Step 1: Calculate tax age if not provided
    if tax_age is None:
        tax_age = calc_tax_age(birth_date, first_sme_hire_date, military_months, gender)

    actual_age = calc_age(birth_date, first_sme_hire_date)

    # Step 2-4: Determine employment type
    employment_type: str
    reduction_rate: float
    exemption_years: int
    reason: str

    if YOUTH_AGE_MIN <= tax_age <= YOUTH_AGE_MAX:
        employment_type = "YOUTH"
        reduction_rate = YOUTH_REDUCTION_RATE
        exemption_years = YOUTH_EXEMPTION_YEARS
        if actual_age != int(tax_age):
            reason = (
                f"세법상 나이 {tax_age:.1f}세 "
                f"(만 {actual_age}세, 군복무 {military_months}개월 차감). "
                f"청년 감면 대상 ({YOUTH_AGE_MIN}~{YOUTH_AGE_MAX}세)."
            )
        else:
            reason = (
                f"만 나이 {actual_age}세. "
                f"청년 감면 대상 ({YOUTH_AGE_MIN}~{YOUTH_AGE_MAX}세)."
            )
    elif actual_age >= SENIOR_AGE_MIN:
        employment_type = "SENIOR"
        reduction_rate = SENIOR_REDUCTION_RATE
        exemption_years = SENIOR_EXEMPTION_YEARS
        reason = (
            f"만 나이 {actual_age}세. "
            f"고령자 감면 대상 ({SENIOR_AGE_MIN}세 이상)."
        )
    else:
        employment_type = "NONE"
        reduction_rate = 0.0
        exemption_years = 0
        reason = (
            f"만 나이 {actual_age}세"
            + (f" (세법상 {tax_age:.1f}세)" if actual_age != int(tax_age) else "")
            + f". 청년({YOUTH_AGE_MIN}~{YOUTH_AGE_MAX}세) 및 "
            f"고령자({SENIOR_AGE_MIN}세 이상) 모두 해당 없음."
        )
        return EligibilityResult(
            employment_type=employment_type,
            reduction_rate=reduction_rate,
            exemption_years=exemption_years,
            exemption_start=None,
            exemption_end=None,
            eligible_years={
                y: False
                for y in range(RECTIFICATION_BASE_YEAR, RECTIFICATION_END_YEAR + 1)
            },
            reason=reason,
        )

    # Step 5: Calculate exemption period
    exemption_start = first_sme_hire_date
    # Exemption lasts for `exemption_years` full years from the hire date.
    # End date is (hire_date + exemption_years years - 1 day).
    exemption_end = first_sme_hire_date + relativedelta(years=exemption_years) - relativedelta(days=1)

    # Step 6: Determine eligible years within rectification window
    eligible_years: dict[int, bool] = {}
    for year in range(RECTIFICATION_BASE_YEAR, RECTIFICATION_END_YEAR + 1):
        # A year is eligible if any part of that calendar year overlaps
        # with the exemption period.
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        is_eligible = exemption_start <= year_end and exemption_end >= year_start
        eligible_years[year] = is_eligible

    return EligibilityResult(
        employment_type=employment_type,
        reduction_rate=reduction_rate,
        exemption_years=exemption_years,
        exemption_start=exemption_start,
        exemption_end=exemption_end,
        eligible_years=eligible_years,
        reason=reason,
    )
