"""
Track 2 -- Acquisition Tax (취득세) calculation engine.

Handles gift acquisition tax (증여 취득세), onerous gift acquisition tax
(부담부증여 취득세), and standard purchase acquisition tax.

Rates:
  - Regulated area gift: 12.4% (취득세 12% + 농어촌특별세 0.2% + 교육세 0.2%)
  - Non-regulated area gift: 3.8% (취득세 3.5% + 교육세 0.3%)
  - Onerous (paid) portion: 3.3% (취득세 2.8% + 농어촌특별세 0.2% + 교육세 0.3%)

All monetary amounts are in Korean won (원) as integers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

__all__ = [
    "AcquisitionTaxResult",
    "REGULATED_GIFT_RATE",
    "NON_REGULATED_GIFT_RATE",
    "ONEROUS_RATE",
    "calc_gift_acquisition_tax",
    "calc_onerous_acquisition_tax",
]

# ── Tax rates (세율) ────────────────────────────────────────────────────────
REGULATED_GIFT_RATE: float = 0.124    # 조정대상지역 증여: 12.4%
NON_REGULATED_GIFT_RATE: float = 0.038  # 비조정대상지역 증여: 3.8%
ONEROUS_RATE: float = 0.033           # 유상분 (부담부증여 유상 취득분): 3.3%


@dataclass(frozen=True)
class AcquisitionTaxResult:
    """Acquisition tax breakdown for gift or onerous gift transfers."""

    gift_portion_tax: int        # 증여분 취득세
    debt_portion_tax: int        # 유상분 취득세 (부담부증여 시, otherwise 0)
    total_tax: int               # 합계


def _gift_rate(is_regulated: bool) -> float:
    """Return the applicable gift acquisition tax rate."""
    return REGULATED_GIFT_RATE if is_regulated else NON_REGULATED_GIFT_RATE


def calc_gift_acquisition_tax(
    market_price: int,
    is_regulated: bool,
) -> AcquisitionTaxResult:
    """
    Calculate acquisition tax for a pure gift (단순 증여).

    The entire market value is subject to the gift acquisition tax rate:
      - 12.4% in a regulated area (조정대상지역)
      - 3.8% in a non-regulated area

    Args:
        market_price: Fair market value (시가) in won.
        is_regulated: Whether the property is in a regulated area.

    Returns:
        AcquisitionTaxResult with gift_portion_tax filled, debt_portion_tax = 0.
    """
    if market_price <= 0:
        return AcquisitionTaxResult(
            gift_portion_tax=0,
            debt_portion_tax=0,
            total_tax=0,
        )

    rate = _gift_rate(is_regulated)
    gift_portion_tax = math.floor(market_price * rate)

    return AcquisitionTaxResult(
        gift_portion_tax=gift_portion_tax,
        debt_portion_tax=0,
        total_tax=gift_portion_tax,
    )


def calc_onerous_acquisition_tax(
    gift_portion: int,
    debt_portion: int,
    is_regulated: bool,
) -> AcquisitionTaxResult:
    """
    Calculate acquisition tax for an onerous gift (부담부증여).

    An onerous gift splits the transfer into two parts:
      - Gift portion (증여분): taxed at gift rate (12.4% or 3.8%)
      - Debt portion (유상분): taxed at onerous rate (3.3%)

    Args:
        gift_portion: Value of the gift portion (시가 - 채무) in won.
        debt_portion: Value of the debt assumed (전세보증금 + 대출) in won.
        is_regulated: Whether the property is in a regulated area.

    Returns:
        AcquisitionTaxResult with both portions calculated.
    """
    gift_portion_value = max(gift_portion, 0)
    debt_portion_value = max(debt_portion, 0)

    gift_rate = _gift_rate(is_regulated)
    gift_tax = math.floor(gift_portion_value * gift_rate)
    debt_tax = math.floor(debt_portion_value * ONEROUS_RATE)

    return AcquisitionTaxResult(
        gift_portion_tax=gift_tax,
        debt_portion_tax=debt_tax,
        total_tax=gift_tax + debt_tax,
    )
