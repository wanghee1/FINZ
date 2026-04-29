"""
Track 1 - Complex (Case B) tax reduction calculation.

Case B applies when the taxpayer has comprehensive income (종합소득):
  - Other income besides earned income, OR
  - Salary from non-SME sources in addition to SME salary.

The reduction is proportionally allocated:
  ratio1 = earned_income_amount / (earned_income_amount + other_income_amount)
  ratio2 = salary_from_sme / total_salary
  raw = calculated_tax * ratio1 * ratio2 * reduction_rate

Then the same annual limit and wage credit adjustment as Case A.

All amounts in won (원). Uses integer arithmetic for money.
"""

import math

from app.engines.common.tax_rates import get_annual_limit
from app.engines.track1.reduction_simple import (
    InputYearData,
    ReductionResult,
)


def compute_reduction_complex(data: InputYearData) -> ReductionResult:
    """
    Compute the tax reduction using the complex (Case B) proportional method.

    This method applies when the taxpayer has income sources beyond a
    single qualifying SME. The reduction is proportionally allocated based
    on the ratio of qualifying income to total income.

    Division-by-zero handling:
      - If (earned_income_amount + other_income_amount) == 0: ratio1 = 0
      - If total_salary == 0: ratio2 = 0
      - If calculated_tax == 0: wage_credit_after = 0

    Args:
        data: InputYearData with the year's tax details.

    Returns:
        ReductionResult with the computed reduction and adjusted figures.
    """
    calculated_tax = data.calculated_tax
    earned = data.earned_income_amount
    other = data.other_income_amount
    sme_salary = data.salary_from_sme
    total_salary = data.total_salary

    # Step 1: Calculate proportional ratios
    total_income = earned + other
    if total_income > 0:
        ratio1 = earned / total_income
    else:
        ratio1 = 0.0

    if total_salary > 0:
        ratio2 = sme_salary / total_salary
    else:
        ratio2 = 0.0

    # Step 2: Raw reduction = calculated_tax * ratio1 * ratio2 * reduction_rate
    raw_reduction = math.floor(
        calculated_tax * ratio1 * ratio2 * data.reduction_rate
    )
    raw_reduction = max(raw_reduction, 0)

    # Step 3: Annual limit
    annual_limit = get_annual_limit(data.year)

    # Step 4: Capped reduction
    reduction_amount = min(raw_reduction, annual_limit)

    # Step 5: Adjusted wage tax credit
    if calculated_tax > 0:
        adjustment_ratio = 1.0 - (reduction_amount / calculated_tax)
        wage_credit_after = math.floor(
            data.wage_tax_credit_before_red * adjustment_ratio
        )
        wage_credit_after = max(wage_credit_after, 0)
    else:
        wage_credit_after = 0

    # Step 6: Other fixed tax credits (표준세액공제, 자녀세액공제 등)
    other_credits = max(
        0,
        calculated_tax
        - data.originally_reported_reduction
        - data.wage_tax_credit_before_red
        - data.originally_reported_final_tax,
    )

    # Step 7: Corrected final tax (기타세액공제 포함)
    corrected_final_tax = max(
        0, calculated_tax - reduction_amount - wage_credit_after - other_credits
    )

    return ReductionResult(
        raw_reduction=raw_reduction,
        annual_limit=annual_limit,
        reduction_amount=reduction_amount,
        wage_credit_after=wage_credit_after,
        corrected_final_tax=corrected_final_tax,
        calc_case="COMPLEX",
    )
