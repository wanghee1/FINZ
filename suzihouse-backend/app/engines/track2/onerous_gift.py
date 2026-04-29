"""
Track 2 -- Onerous Gift (부담부증여) calculation engine.

An onerous gift is a gift with assumed liabilities (전세보증금 + 대출).
The transfer is split into two portions:
  - Gift portion (증여분): market_price - debt  ->  gift tax + gift acquisition tax
  - Sale portion (양도분): debt amount  ->  capital gains tax + onerous acquisition tax

All monetary amounts are in Korean won (원) as integers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.engines.track2.acquisition_tax import (
    calc_onerous_acquisition_tax,
)
from app.engines.track2.capital_gains import calc_capital_gains_tax
from app.engines.track2.gift_tax import calc_gift_tax

__all__ = [
    "OnerousGiftResult",
    "calc_onerous_gift",
]


@dataclass(frozen=True)
class OnerousGiftResult:
    """Complete tax breakdown for an onerous gift (부담부증여)."""

    # ── Gift portion (증여 부분) ──────────────────────────────────────────
    gift_value: int              # 증여재산가액 = 시가 - 채무
    gift_tax: int                # 증여세 납부세액
    gift_acquisition_tax: int    # 증여분 취득세

    # ── Sale portion (양도 부분) ──────────────────────────────────────────
    sale_value: int              # 양도가액 = 채무
    sale_acquisition_price: int  # 취득가 안분 (acquisition_price * debt / market_price)
    capital_gains_tax: int       # 양도소득세 총액
    onerous_acquisition_tax: int # 유상분 취득세

    # ── Totals ────────────────────────────────────────────────────────────
    total_tax: int               # 전체 합계


def calc_onerous_gift(
    market_price: int,
    acquisition_price: int,
    debt_amount: int,
    holding_years: int,
    donee_relation: str,
    is_surcharge: bool,
    is_regulated: bool,
) -> OnerousGiftResult:
    """
    Calculate the total tax burden for an onerous gift (부담부증여).

    The onerous gift splits a property transfer into:

    [Gift portion (증여 부분)]
      증여가액 = 시가 - 채무
      증여세 = calc_gift_tax(증여가액, donee_relation)
      증여취득세 = 증여가액 * (12.4% or 3.8%)

    [Sale portion (양도 부분)]
      양도가액 = 채무 (= debt_amount)
      안분 취득가 = acquisition_price * (debt_amount / market_price)
      양도세 = calc_capital_gains_tax(양도가액=debt, 취득가=안분, ...)
      유상 취득세 = debt * 3.3%

    합계 = 증여세 + 증여취득세 + 양도세 + 유상취득세

    Args:
        market_price: Fair market value (시가) of the property in won.
        acquisition_price: Original acquisition price (취득가액) in won.
        debt_amount: Total liabilities assumed (전세보증금 + 대출) in won.
        holding_years: Full years the property was held.
        donee_relation: Relationship key for gift exemption lookup.
        is_surcharge: Whether multi-house surcharge applies to the sale portion.
        is_regulated: Whether the property is in a regulated area.

    Returns:
        OnerousGiftResult with full breakdown of both portions.
    """
    # ── Edge case: no debt means this is a pure gift ─────────────────────
    if debt_amount <= 0:
        gift_result = calc_gift_tax(
            market_price=market_price,
            donee_relation=donee_relation,
        )
        acq_result = calc_onerous_acquisition_tax(
            gift_portion=market_price,
            debt_portion=0,
            is_regulated=is_regulated,
        )
        return OnerousGiftResult(
            gift_value=market_price,
            gift_tax=gift_result.total_tax,
            gift_acquisition_tax=acq_result.gift_portion_tax,
            sale_value=0,
            sale_acquisition_price=0,
            capital_gains_tax=0,
            onerous_acquisition_tax=0,
            total_tax=gift_result.total_tax + acq_result.gift_portion_tax,
        )

    # ── Edge case: debt >= market_price means entire transfer is "sale" ──
    # Clamp debt to market_price to avoid negative gift portion
    effective_debt = min(debt_amount, market_price)

    # ── Gift portion ─────────────────────────────────────────────────────
    gift_value = market_price - effective_debt

    gift_result = calc_gift_tax(
        market_price=gift_value,
        donee_relation=donee_relation,
    )
    gift_tax = gift_result.total_tax

    # ── Sale portion ─────────────────────────────────────────────────────
    sale_value = effective_debt

    # Proportional allocation of acquisition price (안분 취득가)
    if market_price > 0:
        sale_acquisition_price = math.floor(
            acquisition_price * (effective_debt / market_price)
        )
    else:
        sale_acquisition_price = 0

    cg_result = calc_capital_gains_tax(
        selling_price=sale_value,
        acquisition_price=sale_acquisition_price,
        holding_years=holding_years,
        is_surcharge=is_surcharge,
    )
    capital_gains_tax = cg_result.total_tax

    # ── Acquisition tax (both portions) ──────────────────────────────────
    acq_result = calc_onerous_acquisition_tax(
        gift_portion=gift_value,
        debt_portion=sale_value,
        is_regulated=is_regulated,
    )
    gift_acquisition_tax = acq_result.gift_portion_tax
    onerous_acquisition_tax = acq_result.debt_portion_tax

    # ── Grand total ──────────────────────────────────────────────────────
    total_tax = (
        gift_tax
        + gift_acquisition_tax
        + capital_gains_tax
        + onerous_acquisition_tax
    )

    return OnerousGiftResult(
        gift_value=gift_value,
        gift_tax=gift_tax,
        gift_acquisition_tax=gift_acquisition_tax,
        sale_value=sale_value,
        sale_acquisition_price=sale_acquisition_price,
        capital_gains_tax=capital_gains_tax,
        onerous_acquisition_tax=onerous_acquisition_tax,
        total_tax=total_tax,
    )
