"""
Track 1 - SME Employment Income Tax Reduction (중소기업 취업자 소득세 감면) Engine.

Provides:
  - Age and military service calculations (tax_age)
  - Eligibility determination (eligibility)
  - Simple (Case A) and complex (Case B) reduction calculations
  - Per-year refund calculation
  - Multi-year refund orchestration
"""

from app.engines.track1.eligibility import EligibilityResult, judge_eligibility
from app.engines.track1.multi_year import (
    MultiYearResult,
    YearDetail,
    calc_multi_year_refund,
)
from app.engines.track1.reduction_complex import compute_reduction_complex
from app.engines.track1.reduction_simple import (
    InputYearData,
    ReductionResult,
    compute_reduction_simple,
)
from app.engines.track1.refund_calc import RefundResult, calc_year_refund
from app.engines.track1.tax_age import (
    calc_age,
    calc_military_months,
    calc_tax_age,
    needs_military_doc,
)

__all__ = [
    # Tax age
    "calc_age",
    "calc_military_months",
    "calc_tax_age",
    "needs_military_doc",
    # Eligibility
    "judge_eligibility",
    "EligibilityResult",
    # Reduction
    "InputYearData",
    "ReductionResult",
    "compute_reduction_simple",
    "compute_reduction_complex",
    # Refund
    "RefundResult",
    "calc_year_refund",
    # Multi-year
    "MultiYearResult",
    "YearDetail",
    "calc_multi_year_refund",
]
