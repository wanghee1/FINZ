"""
Track 2 -- Gift Tax (증여세) calculation engine.

Implements Korean gift tax computation with relationship-based exemptions
and the 3% filing deduction (신고세액공제).

All monetary amounts are in Korean won (원) as integers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.engines.common.tax_rates import (
    calc_progressive_tax,
    load_gift_tax_brackets,
)

__all__ = [
    "GiftTaxResult",
    "GIFT_EXEMPTIONS",
    "calc_gift_tax",
]

# ── Exemption amounts by donee relationship (증여재산공제) ──────────────────
# 10-year cumulative exemption window
GIFT_EXEMPTIONS: dict[str, int] = {
    "SPOUSE": 600_000_000,                  # 배우자: 6억
    "LINEAL_DESCENDANT_ADULT": 50_000_000,  # 직계비속 성인: 5천만
    "LINEAL_DESCENDANT_MINOR": 20_000_000,  # 직계비속 미성년: 2천만
}

# ── Filing deduction rate (신고세액공제) ────────────────────────────────────
FILING_DEDUCTION_RATE: float = 0.03  # 3%


@dataclass(frozen=True)
class GiftTaxResult:
    """Complete gift tax breakdown."""

    gift_value: int              # 증여재산가액
    exemption: int               # 증여재산공제
    taxable_amount: int          # 과세표준
    calculated_tax: int          # 산출세액
    filing_deduction: int        # 신고세액공제 (3%)
    total_tax: int               # 납부세액


def calc_gift_tax(
    market_price: int,
    donee_relation: str,
    prior_gifts: int = 0,
) -> GiftTaxResult:
    """
    Calculate gift tax for a property transfer.

    Formula:
      증여재산가액 = market_price
      증여재산공제 = GIFT_EXEMPTIONS[donee_relation]
      과세표준 = market_price - 공제 - prior_gifts  (min 0)
      산출세액 = progressive_tax(과세표준, gift_brackets)
      신고세액공제 = 산출세액 * 3%
      납부세액 = 산출세액 - 신고세액공제

    Note: Gift tax is identical pre/post 5.9 policy (중과 무관).
    The surcharge policy only affects capital gains tax, not gift tax.

    Args:
        market_price: Fair market value (시가) of the gifted property in won.
        donee_relation: Relationship key -- one of GIFT_EXEMPTIONS keys.
        prior_gifts: Sum of prior gifts within the 10-year window (기증여재산가액).

    Returns:
        GiftTaxResult with full breakdown.

    Raises:
        ValueError: If donee_relation is not a recognized key.
    """
    if donee_relation not in GIFT_EXEMPTIONS:
        raise ValueError(
            f"Unknown donee_relation '{donee_relation}'. "
            f"Must be one of: {list(GIFT_EXEMPTIONS.keys())}"
        )

    gift_value = market_price
    exemption = GIFT_EXEMPTIONS[donee_relation]

    # Taxable amount: gift value minus exemption minus prior gifts
    # The exemption is reduced by prior gifts already claimed within 10 years.
    # Effective formula: taxable = gift_value - (exemption - prior_gifts)
    # which equals: gift_value - exemption + prior_gifts
    # But if prior_gifts already exceeded exemption, the full gift_value
    # (plus excess) becomes taxable.
    remaining_exemption = max(exemption - prior_gifts, 0)
    taxable_amount = max(gift_value - remaining_exemption, 0)

    if taxable_amount <= 0:
        return GiftTaxResult(
            gift_value=gift_value,
            exemption=exemption,
            taxable_amount=0,
            calculated_tax=0,
            filing_deduction=0,
            total_tax=0,
        )

    # Progressive tax on taxable amount
    brackets = load_gift_tax_brackets()
    calculated_tax, _, _ = calc_progressive_tax(taxable_amount, brackets)

    # Filing deduction (신고세액공제): 3% discount for voluntary filing
    filing_deduction = math.floor(calculated_tax * FILING_DEDUCTION_RATE)

    # Final tax payable
    total_tax = max(calculated_tax - filing_deduction, 0)

    return GiftTaxResult(
        gift_value=gift_value,
        exemption=exemption,
        taxable_amount=taxable_amount,
        calculated_tax=calculated_tax,
        filing_deduction=filing_deduction,
        total_tax=total_tax,
    )
