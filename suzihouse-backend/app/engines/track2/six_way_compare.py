"""
Track 2 -- Six-Way Comparison Engine (6가지 시나리오 비교).

Computes all six property-transfer scenarios for two properties (A and B),
each with three methods (양도 / 증여 / 부담부증여), and evaluates both
pre-policy (비중과) and post-policy (중과) tax burdens.

Scenarios:
  1. A주택 양도 (Sell A)
  2. A주택 증여 (Gift A)
  3. A주택 부담부증여 (Onerous Gift A)
  4. B주택 양도 (Sell B)
  5. B주택 증여 (Gift B)
  6. B주택 부담부증여 (Onerous Gift B)

All monetary amounts are in Korean won (원) as integers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from app.engines.track2.acquisition_tax import calc_gift_acquisition_tax
from app.engines.track2.capital_gains import calc_capital_gains_tax
from app.engines.track2.gift_tax import calc_gift_tax
from app.engines.track2.onerous_gift import calc_onerous_gift

__all__ = [
    "SixWayInput",
    "ScenarioDetail",
    "SixWayResult",
    "calculate_six_way",
]


# ── Input / Output dataclasses ──────────────────────────────────────────────


@dataclass
class SixWayInput:
    """Input parameters for the six-way comparison."""

    # Property A (required)
    a_market_price: int
    a_acquisition_price: int
    a_acquired_at: date
    a_is_regulated: bool

    # Property B (required)
    b_market_price: int
    b_acquisition_price: int
    b_acquired_at: date
    b_is_regulated: bool

    # Optional fields (all with defaults)
    a_lease_deposit: int = 0
    a_loan_balance: int = 0
    b_lease_deposit: int = 0
    b_loan_balance: int = 0
    donee_relation: str = "LINEAL_DESCENDANT_ADULT"
    reference_date: Optional[date] = None  # defaults to today


@dataclass
class ScenarioDetail:
    """Detailed tax breakdown for a single scenario, both pre and post policy."""

    scenario_no: int             # 1~6
    label: str                   # e.g. "A주택 양도", "B주택 증여"
    target: str                  # "A" or "B"
    method: str                  # "SALE", "GIFT", "ONEROUS_GIFT"

    # Pre-policy (비중과) figures
    pre_capital_gains_tax: int = 0
    pre_gift_tax: int = 0
    pre_acquisition_tax: int = 0
    pre_total: int = 0

    # Post-policy (중과) figures
    post_capital_gains_tax: int = 0
    post_gift_tax: int = 0
    post_acquisition_tax: int = 0
    post_total: int = 0

    # Increase due to surcharge
    surcharge_increase: int = 0


@dataclass
class SixWayResult:
    """Aggregated result of all six scenarios with rankings."""

    scenarios: list[ScenarioDetail] = field(default_factory=list)
    rank_pre: list[int] = field(default_factory=list)   # scenario_nos sorted by pre_total asc
    rank_post: list[int] = field(default_factory=list)  # scenario_nos sorted by post_total asc
    optimal_pre: int = 0          # best scenario_no for pre-policy
    optimal_post: int = 0         # best scenario_no for post-policy
    risk_delta: int = 0           # max(post_total) - min(pre_total)


# ── Scenario definitions ────────────────────────────────────────────────────

_SCENARIO_DEFS = [
    {"no": 1, "label": "A주택 양도",     "target": "A", "method": "SALE"},
    {"no": 2, "label": "A주택 증여",     "target": "A", "method": "GIFT"},
    {"no": 3, "label": "A주택 부담부증여", "target": "A", "method": "ONEROUS_GIFT"},
    {"no": 4, "label": "B주택 양도",     "target": "B", "method": "SALE"},
    {"no": 5, "label": "B주택 증여",     "target": "B", "method": "GIFT"},
    {"no": 6, "label": "B주택 부담부증여", "target": "B", "method": "ONEROUS_GIFT"},
]


# ── Internal helpers ────────────────────────────────────────────────────────


def _calc_holding_years(acquired_at: date, reference: date) -> int:
    """Calculate full years held (floor division of total days)."""
    delta_days = (reference - acquired_at).days
    if delta_days < 0:
        return 0
    return delta_days // 365


def _calc_sale_scenario(
    market_price: int,
    acquisition_price: int,
    holding_years: int,
    is_surcharge: bool,
) -> tuple[int, int, int, int]:
    """
    Calculate tax for a sale (양도) scenario.

    Returns:
        (capital_gains_tax, gift_tax, acquisition_tax, total)
    """
    result = calc_capital_gains_tax(
        selling_price=market_price,
        acquisition_price=acquisition_price,
        holding_years=holding_years,
        is_surcharge=is_surcharge,
    )
    return (result.total_tax, 0, 0, result.total_tax)


def _calc_gift_scenario(
    market_price: int,
    is_regulated: bool,
    donee_relation: str,
) -> tuple[int, int, int, int]:
    """
    Calculate tax for a pure gift (증여) scenario.

    Gift tax and gift acquisition tax are unaffected by surcharge policy.

    Returns:
        (capital_gains_tax, gift_tax, acquisition_tax, total)
    """
    gift_result = calc_gift_tax(
        market_price=market_price,
        donee_relation=donee_relation,
    )
    acq_result = calc_gift_acquisition_tax(
        market_price=market_price,
        is_regulated=is_regulated,
    )
    total = gift_result.total_tax + acq_result.total_tax
    return (0, gift_result.total_tax, acq_result.total_tax, total)


def _calc_onerous_scenario(
    market_price: int,
    acquisition_price: int,
    debt_amount: int,
    holding_years: int,
    donee_relation: str,
    is_surcharge: bool,
    is_regulated: bool,
) -> tuple[int, int, int, int]:
    """
    Calculate tax for an onerous gift (부담부증여) scenario.

    Returns:
        (capital_gains_tax, gift_tax, acquisition_tax, total)
    """
    result = calc_onerous_gift(
        market_price=market_price,
        acquisition_price=acquisition_price,
        debt_amount=debt_amount,
        holding_years=holding_years,
        donee_relation=donee_relation,
        is_surcharge=is_surcharge,
        is_regulated=is_regulated,
    )
    acquisition_tax = result.gift_acquisition_tax + result.onerous_acquisition_tax
    return (result.capital_gains_tax, result.gift_tax, acquisition_tax, result.total_tax)


def _get_property_params(
    inputs: SixWayInput,
    target: str,
    reference: date,
) -> dict:
    """Extract property-specific parameters from SixWayInput for a given target."""
    if target == "A":
        return {
            "market_price": inputs.a_market_price,
            "acquisition_price": inputs.a_acquisition_price,
            "holding_years": _calc_holding_years(inputs.a_acquired_at, reference),
            "is_regulated": inputs.a_is_regulated,
            "debt_amount": inputs.a_lease_deposit + inputs.a_loan_balance,
        }
    else:
        return {
            "market_price": inputs.b_market_price,
            "acquisition_price": inputs.b_acquisition_price,
            "holding_years": _calc_holding_years(inputs.b_acquired_at, reference),
            "is_regulated": inputs.b_is_regulated,
            "debt_amount": inputs.b_lease_deposit + inputs.b_loan_balance,
        }


def _compute_scenario(
    props: dict,
    method: str,
    donee_relation: str,
    is_surcharge: bool,
) -> tuple[int, int, int, int]:
    """
    Route to the correct calculator based on transfer method.

    Returns:
        (capital_gains_tax, gift_tax, acquisition_tax, total)
    """
    if method == "SALE":
        return _calc_sale_scenario(
            market_price=props["market_price"],
            acquisition_price=props["acquisition_price"],
            holding_years=props["holding_years"],
            is_surcharge=is_surcharge,
        )
    elif method == "GIFT":
        # Gift tax is unaffected by surcharge; same for pre and post
        return _calc_gift_scenario(
            market_price=props["market_price"],
            is_regulated=props["is_regulated"],
            donee_relation=donee_relation,
        )
    elif method == "ONEROUS_GIFT":
        return _calc_onerous_scenario(
            market_price=props["market_price"],
            acquisition_price=props["acquisition_price"],
            debt_amount=props["debt_amount"],
            holding_years=props["holding_years"],
            donee_relation=donee_relation,
            is_surcharge=is_surcharge,
            is_regulated=props["is_regulated"],
        )
    else:
        raise ValueError(f"Unknown transfer method: {method}")


# ── Main entry point ────────────────────────────────────────────────────────


def calculate_six_way(inputs: SixWayInput) -> SixWayResult:
    """
    Calculate all six property transfer scenarios and rank them.

    For each of the 6 scenarios, calculates:
      - pre (비중과): is_surcharge=False  (before surcharge enforcement)
      - post (중과): is_surcharge=True   (after surcharge enforcement)

    Scenarios:
      1. A양도  2. A증여  3. A부담부증여
      4. B양도  5. B증여  6. B부담부증여

    holding_years = (reference_date - acquired_at).days // 365
    debt = lease_deposit + loan_balance for the target property

    Sorting:
      rank_pre: scenario numbers sorted by pre_total ascending
      rank_post: scenario numbers sorted by post_total ascending

    Args:
        inputs: SixWayInput with both property details and common parameters.

    Returns:
        SixWayResult with all scenarios, rankings, and risk delta.
    """
    reference = inputs.reference_date or date.today()
    scenarios: list[ScenarioDetail] = []

    for sdef in _SCENARIO_DEFS:
        scenario_no: int = sdef["no"]
        label: str = sdef["label"]
        target: str = sdef["target"]
        method: str = sdef["method"]

        props = _get_property_params(inputs, target, reference)

        # Pre-policy (비중과): surcharge = False
        pre_cg, pre_gift, pre_acq, pre_total = _compute_scenario(
            props=props,
            method=method,
            donee_relation=inputs.donee_relation,
            is_surcharge=False,
        )

        # Post-policy (중과): surcharge = True
        post_cg, post_gift, post_acq, post_total = _compute_scenario(
            props=props,
            method=method,
            donee_relation=inputs.donee_relation,
            is_surcharge=True,
        )

        surcharge_increase = post_total - pre_total

        scenarios.append(
            ScenarioDetail(
                scenario_no=scenario_no,
                label=label,
                target=target,
                method=method,
                pre_capital_gains_tax=pre_cg,
                pre_gift_tax=pre_gift,
                pre_acquisition_tax=pre_acq,
                pre_total=pre_total,
                post_capital_gains_tax=post_cg,
                post_gift_tax=post_gift,
                post_acquisition_tax=post_acq,
                post_total=post_total,
                surcharge_increase=surcharge_increase,
            )
        )

    # ── Rankings ─────────────────────────────────────────────────────────
    rank_pre = [
        s.scenario_no
        for s in sorted(scenarios, key=lambda s: s.pre_total)
    ]
    rank_post = [
        s.scenario_no
        for s in sorted(scenarios, key=lambda s: s.post_total)
    ]

    optimal_pre = rank_pre[0] if rank_pre else 0
    optimal_post = rank_post[0] if rank_post else 0

    # ── Risk delta ───────────────────────────────────────────────────────
    # Worst-case post-policy total minus best-case pre-policy total
    all_post_totals = [s.post_total for s in scenarios]
    all_pre_totals = [s.pre_total for s in scenarios]

    if all_post_totals and all_pre_totals:
        risk_delta = max(all_post_totals) - min(all_pre_totals)
    else:
        risk_delta = 0

    return SixWayResult(
        scenarios=scenarios,
        rank_pre=rank_pre,
        rank_post=rank_post,
        optimal_pre=optimal_pre,
        optimal_post=optimal_post,
        risk_delta=risk_delta,
    )
