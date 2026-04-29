"""
Track 1 - Refund calculation for a single year.

Computes the income tax refund and local income tax refund by comparing
the originally reported final tax with the corrected (recalculated) final tax.

refund_income_tax = originally_reported_final_tax - corrected_final_tax
  (If negative, i.e. original filing already had a larger reduction, refund = 0)
refund_local_tax = refund_income_tax * 10%
refund_total = refund_income_tax + refund_local_tax

All amounts in won (원). Uses integer arithmetic for money.
"""

import math
from dataclasses import dataclass

from app.engines.common.constants import LOCAL_TAX_RATE
from app.engines.track1.reduction_simple import (
    InputYearData,
    ReductionResult,
)


@dataclass
class RefundResult:
    """Result of a single year's refund calculation."""

    refund_income_tax: int  # 소득세 환급
    refund_local_tax: int  # 지방소득세 환급
    refund_total: int  # 총 환급액


def calc_year_refund(data: InputYearData, reduction: ReductionResult) -> RefundResult:
    """
    Calculate the refund for a single tax year.

    The refund is the difference between what was originally paid (결정세액)
    and what should have been paid after applying the SME reduction.

    If the corrected final tax is higher than the original (meaning the
    original filing already applied a larger reduction), the refund is zero
    -- we do not ask the taxpayer to pay more in a rectification scenario.

    Args:
        data: InputYearData with the originally reported final tax.
        reduction: ReductionResult with the corrected final tax.

    Returns:
        RefundResult with income tax refund, local tax refund, and total.
    """
    # Income tax refund
    refund_income_tax = data.originally_reported_final_tax - reduction.corrected_final_tax

    # If negative, no refund (original filing was already more favorable)
    if refund_income_tax < 0:
        refund_income_tax = 0

    # Local income tax refund = income tax refund * 10%
    refund_local_tax = math.floor(refund_income_tax * LOCAL_TAX_RATE)

    # Total refund
    refund_total = refund_income_tax + refund_local_tax

    return RefundResult(
        refund_income_tax=refund_income_tax,
        refund_local_tax=refund_local_tax,
        refund_total=refund_total,
    )
