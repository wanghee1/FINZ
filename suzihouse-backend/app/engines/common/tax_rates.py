"""
Tax bracket loading and progressive tax calculation utilities.

All monetary amounts are in Korean won (원).
Uses integer arithmetic for money; float only for rates and ratios.
"""

import json
import math
from pathlib import Path
from typing import Optional

from app.engines.common.constants import (
    ANNUAL_LIMIT_BEFORE_2023,
    ANNUAL_LIMIT_2023_ONWARDS,
)

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "config"

# ── Cached data ─────────────────────────────────────────────────────
_income_tax_data: Optional[dict] = None
_capital_gains_data: Optional[list] = None
_gift_tax_data: Optional[list] = None


def _get_income_tax_data() -> dict:
    """Load and cache income_tax_rates.json."""
    global _income_tax_data
    if _income_tax_data is None:
        path = _CONFIG_DIR / "income_tax_rates.json"
        with open(path, "r", encoding="utf-8") as f:
            _income_tax_data = json.load(f)
    return _income_tax_data


def _get_capital_gains_data() -> list:
    """Load and cache capital_gains_rates.json."""
    global _capital_gains_data
    if _capital_gains_data is None:
        path = _CONFIG_DIR / "capital_gains_rates.json"
        with open(path, "r", encoding="utf-8") as f:
            _capital_gains_data = json.load(f)
    return _capital_gains_data


def _get_gift_tax_data() -> list:
    """Load and cache gift_tax_rates.json."""
    global _gift_tax_data
    if _gift_tax_data is None:
        path = _CONFIG_DIR / "gift_tax_rates.json"
        with open(path, "r", encoding="utf-8") as f:
            _gift_tax_data = json.load(f)
    return _gift_tax_data


# ── Bracket loaders ─────────────────────────────────────────────────


def load_income_tax_brackets(year: int) -> list[dict]:
    """
    Load income tax brackets for a given year.

    Bracket selection logic:
      - year == 2020 -> "2020" brackets (7 brackets, max 42%)
      - year in [2021, 2022] -> "2021" brackets (8 brackets, max 45%)
      - year >= 2023 -> "2023" brackets (8 brackets, max 45%, wider lower bands)

    Each bracket dict has keys: upper_limit (int|None), rate (float), deduction (int).

    Args:
        year: The tax year.

    Returns:
        List of bracket dicts sorted by ascending upper_limit.
    """
    data = _get_income_tax_data()
    if year <= 2020:
        key = "2020"
    elif year <= 2022:
        key = "2021"
    else:
        key = "2023"
    return data[key]


def load_capital_gains_brackets() -> list[dict]:
    """
    Load capital gains tax brackets.

    Each bracket dict has keys:
      upper_limit (int|None), base_rate (float), deduction (int),
      surcharge_rate_2house (float).

    Returns:
        List of bracket dicts.
    """
    return _get_capital_gains_data()


def load_gift_tax_brackets() -> list[dict]:
    """
    Load gift tax brackets.

    Each bracket dict has keys: upper_limit (int|None), rate (float), deduction (int).

    Returns:
        List of bracket dicts.
    """
    return _get_gift_tax_data()


# ── Progressive tax calculation ─────────────────────────────────────


def calc_progressive_tax(
    taxable_amount: int,
    brackets: list[dict],
) -> tuple[int, float, int]:
    """
    Calculate tax using the standard Korean progressive formula.

    Formula: tax = taxable_amount * rate - deduction

    The function finds the applicable bracket and applies the formula.

    Args:
        taxable_amount: The taxable amount in won. Must be >= 0.
        brackets: List of bracket dicts with keys 'upper_limit' (int|None),
                  'rate' (float), and 'deduction' (int).

    Returns:
        A tuple of (tax: int, effective_rate: float, bracket_deduction: int).
        - tax is floored to integer (always >= 0).
        - effective_rate is the actual tax / taxable_amount ratio (0.0 if taxable_amount == 0).
        - bracket_deduction is the deduction value from the applied bracket.
    """
    if taxable_amount <= 0:
        return (0, 0.0, 0)

    applied_rate = 0.0
    applied_deduction = 0

    for bracket in brackets:
        upper = bracket.get("upper_limit")
        rate = bracket.get("rate", bracket.get("base_rate", 0.0))
        deduction = bracket["deduction"]

        if upper is None or taxable_amount <= upper:
            applied_rate = rate
            applied_deduction = deduction
            break

    raw_tax = taxable_amount * applied_rate - applied_deduction
    tax = max(0, math.floor(raw_tax))

    effective_rate = tax / taxable_amount if taxable_amount > 0 else 0.0

    return (tax, effective_rate, applied_deduction)


# ── Annual limit helper ─────────────────────────────────────────────


def get_annual_limit(year: int) -> int:
    """
    Return the annual tax reduction limit for a given year.

    Args:
        year: The tax year.

    Returns:
        1,500,000 won for year <= 2022, 2,000,000 won for year >= 2023.
    """
    if year <= 2022:
        return ANNUAL_LIMIT_BEFORE_2023
    return ANNUAL_LIMIT_2023_ONWARDS
