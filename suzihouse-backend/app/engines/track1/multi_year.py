"""
Track 1 - Multi-year refund orchestrator.

Iterates over multiple tax years, automatically selecting Case A (simple)
or Case B (complex) for each year, computes the reduction and refund,
and aggregates the results.

Selection rule for Case A vs Case B:
  Case A (SIMPLE): other_income_amount == 0 AND salary_from_sme == total_salary
  Case B (COMPLEX): otherwise (proportional allocation needed)

All amounts in won (원).
"""

from dataclasses import dataclass, field

from app.engines.track1.reduction_complex import compute_reduction_complex
from app.engines.track1.reduction_simple import (
    InputYearData,
    ReductionResult,
    compute_reduction_simple,
)
from app.engines.track1.refund_calc import RefundResult, calc_year_refund


@dataclass
class YearDetail:
    """Detailed results for a single year within a multi-year calculation."""

    year: int
    eligible: bool
    calc_case: str  # "SIMPLE", "COMPLEX", or "SKIPPED"
    reduction: ReductionResult | None
    refund: RefundResult | None


@dataclass
class MultiYearResult:
    """Aggregated results across all rectification years."""

    year_results: list[YearDetail] = field(default_factory=list)
    total_estimated_refund: int = 0  # Total income tax refund across all years
    total_local_tax_refund: int = 0  # Total local tax refund across all years
    total_refund: int = 0  # Grand total refund


def _is_simple_case(data: InputYearData) -> bool:
    """
    Determine whether the simple (Case A) calculation applies.

    Case A applies when:
      - There is no other income (other_income_amount == 0)
      - All salary comes from the qualifying SME (salary_from_sme == total_salary)

    If total_salary and salary_from_sme are both 0, we treat it as simple
    (no income to allocate proportionally).
    """
    has_no_other_income = data.other_income_amount == 0
    all_salary_from_sme = (
        data.salary_from_sme == data.total_salary
        or (data.total_salary == 0 and data.salary_from_sme == 0)
    )
    return has_no_other_income and all_salary_from_sme


def calc_multi_year_refund(
    years_data: list[InputYearData],
    eligible_years: dict[int, bool],
) -> MultiYearResult:
    """
    Calculate the total refund across multiple tax years.

    For each year in years_data:
      - If eligible_years[year] is True: compute reduction and refund.
      - If eligible_years[year] is False: skip (zero refund for that year).

    Automatically selects Case A (simple) or Case B (complex) based on
    the income composition of each year.

    Args:
        years_data: List of InputYearData, one per tax year.
        eligible_years: Dict mapping year -> eligibility boolean.

    Returns:
        MultiYearResult with per-year details and aggregated totals.
    """
    result = MultiYearResult()

    for data in years_data:
        year = data.year
        is_eligible = eligible_years.get(year, False)

        if not is_eligible:
            # Year is not within the exemption period -- skip
            detail = YearDetail(
                year=year,
                eligible=False,
                calc_case="SKIPPED",
                reduction=None,
                refund=None,
            )
            result.year_results.append(detail)
            continue

        # Select calculation method
        if _is_simple_case(data):
            reduction = compute_reduction_simple(data)
        else:
            reduction = compute_reduction_complex(data)

        # Calculate refund
        refund = calc_year_refund(data, reduction)

        detail = YearDetail(
            year=year,
            eligible=True,
            calc_case=reduction.calc_case,
            reduction=reduction,
            refund=refund,
        )
        result.year_results.append(detail)

        # Accumulate totals
        result.total_estimated_refund += refund.refund_income_tax
        result.total_local_tax_refund += refund.refund_local_tax
        result.total_refund += refund.refund_total

    return result
