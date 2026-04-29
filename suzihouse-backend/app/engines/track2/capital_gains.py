"""
Track 2 -- Capital Gains Tax (양도소득세) calculation engine.

Handles both normal (비중과) and surcharge (중과) scenarios for
multi-house property dispositions under Korean tax law.

All monetary amounts are in Korean won (원) as integers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.engines.common.constants import LOCAL_TAX_RATE
from app.engines.common.tax_rates import (
    calc_progressive_tax,
    load_capital_gains_brackets,
)

__all__ = [
    "CapitalGainsTaxResult",
    "calc_long_term_deduction_rate",
    "calc_capital_gains_tax",
]

# ── Basic deduction (기본공제) ──────────────────────────────────────────────
BASIC_DEDUCTION: int = 2_500_000  # 2,500,000 won per transfer

# ── Surcharge addition rate for 2-house holders ────────────────────────────
SURCHARGE_ADDITION_RATE: float = 0.20  # 20%p added for 2주택 중과


@dataclass(frozen=True)
class CapitalGainsTaxResult:
    """Complete capital gains tax breakdown for a single property sale."""

    gain: int                    # 양도차익
    long_term_deduction: int     # 장기보유특별공제
    taxable_amount: int          # 과세표준
    base_tax: int                # 기본세율 산출세액
    surcharge_tax: int           # 중과 가산세 (0 if not surcharge)
    total_income_tax: int        # 산출세액 합계
    local_tax: int               # 지방소득세 (10%)
    total_tax: int               # 총 세액


def calc_long_term_deduction_rate(holding_years: int) -> float:
    """
    장기보유특별공제율 (Long-term Holding Special Deduction Rate).

    Schedule:
      - Less than 3 years: 0%
      - 3 years: 6%
      - 4 years: 8%
      - ...each additional year: +2%
      - 15 years or more: 30% (cap)

    Args:
        holding_years: Number of full years the property was held.

    Returns:
        Deduction rate as a float (e.g. 0.06 for 6%).
    """
    if holding_years < 3:
        return 0.0

    # 3 years = 6%, each year +2%, capped at 30% (15+ years)
    rate = 0.06 + (holding_years - 3) * 0.02
    return min(rate, 0.30)


def calc_capital_gains_tax(
    selling_price: int,
    acquisition_price: int,
    holding_years: int,
    is_surcharge: bool,
    expenses: int = 0,
) -> CapitalGainsTaxResult:
    """
    Calculate capital gains tax for a property sale.

    [Normal (비중과)]
      양도차익 = selling_price - acquisition_price - expenses
      장특공제 = 양도차익 * deduction_rate(holding_years)
      과세표준 = 양도차익 - 장특공제 - 2,500,000 (기본공제)
      산출세액 = progressive_tax(과세표준, base_rate brackets)
      지방소득세 = 산출세액 * 10%

    [Surcharge (중과, is_surcharge=True)]
      장특공제 = 0 (중과 시 적용 불가)
      과세표준 = 양도차익 - 2,500,000
      기본세액 = progressive_tax(과세표준, base_rate brackets)
      가산세 = 과세표준 * 20% (2주택 중과 추가세율)
      산출세액 = 기본세액 + 가산세
      지방소득세 = 산출세액 * 10%

    Args:
        selling_price: Sale price (양도가액) in won.
        acquisition_price: Acquisition price (취득가액) in won.
        holding_years: Full years held.
        is_surcharge: Whether multi-house surcharge applies.
        expenses: Necessary expenses (필요경비) such as brokerage, etc.

    Returns:
        CapitalGainsTaxResult with full breakdown.
    """
    # 1. Calculate gain (양도차익)
    gain = selling_price - acquisition_price - expenses
    if gain <= 0:
        return CapitalGainsTaxResult(
            gain=max(gain, 0),
            long_term_deduction=0,
            taxable_amount=0,
            base_tax=0,
            surcharge_tax=0,
            total_income_tax=0,
            local_tax=0,
            total_tax=0,
        )

    # 2. Long-term holding deduction (장기보유특별공제)
    if is_surcharge:
        # Surcharge properties cannot claim long-term deduction
        long_term_deduction = 0
    else:
        deduction_rate = calc_long_term_deduction_rate(holding_years)
        long_term_deduction = math.floor(gain * deduction_rate)

    # 3. Taxable amount (과세표준)
    taxable_amount = gain - long_term_deduction - BASIC_DEDUCTION
    taxable_amount = max(taxable_amount, 0)

    # 4. Load brackets
    brackets = load_capital_gains_brackets()

    # 5. Base tax using progressive rate table
    base_tax, _, _ = calc_progressive_tax(taxable_amount, brackets)

    # 6. Surcharge additional tax (중과 가산세)
    if is_surcharge and taxable_amount > 0:
        surcharge_tax = math.floor(taxable_amount * SURCHARGE_ADDITION_RATE)
    else:
        surcharge_tax = 0

    # 7. Total income tax (산출세액)
    total_income_tax = base_tax + surcharge_tax

    # 8. Local income tax (지방소득세 = 10%)
    local_tax = math.floor(total_income_tax * LOCAL_TAX_RATE)

    # 9. Grand total
    total_tax = total_income_tax + local_tax

    return CapitalGainsTaxResult(
        gain=gain,
        long_term_deduction=long_term_deduction,
        taxable_amount=taxable_amount,
        base_tax=base_tax,
        surcharge_tax=surcharge_tax,
        total_income_tax=total_income_tax,
        local_tax=local_tax,
        total_tax=total_tax,
    )
