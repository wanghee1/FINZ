"""
Track 2 -- Surcharge (중과) applicability determination.

Determines whether the multi-house surcharge applies to a property transfer.
Under the 5.9 policy, surcharge was suspended for multi-house sellers through
a grace period, but may be reinstated afterward.

In practice, the six-way comparator always calculates both pre (비중과) and
post (중과) scenarios for user comparison.
"""

from __future__ import annotations

from datetime import date

__all__ = [
    "SURCHARGE_GRACE_DEADLINE",
    "is_surcharge_applicable",
]

# ── Grace period deadline ───────────────────────────────────────────────────
# The surcharge grace period expires on 2026-05-09 (5.9 대책 유예 종료일).
SURCHARGE_GRACE_DEADLINE: date = date(2026, 5, 9)


def is_surcharge_applicable(
    num_houses: int = 2,
    is_regulated: bool = True,
    deadline: date = SURCHARGE_GRACE_DEADLINE,
) -> bool:
    """
    Determine whether the multi-house surcharge (중과) would apply.

    Surcharge conditions (all must be true):
      1. Owner holds 2 or more houses (다주택자)
      2. Property is in a regulated area (조정대상지역)

    The deadline parameter represents the grace period expiration.
    This function does NOT compare against today's date because the
    six-way comparator always calculates both pre and post scenarios
    regardless of timing.

    Args:
        num_houses: Number of houses owned (including the one being transferred).
        is_regulated: Whether the target property is in a regulated area.
        deadline: The surcharge grace period deadline (default: 2026-05-09).

    Returns:
        True if surcharge conditions are met (2+ houses AND regulated area).
    """
    return num_houses >= 2 and is_regulated
