"""
Common tax infrastructure: constants, bracket loaders, and progressive tax calculation.
"""

from app.engines.common.constants import (
    ANNUAL_LIMIT_2023_ONWARDS,
    ANNUAL_LIMIT_BEFORE_2023,
    LOCAL_TAX_RATE,
    MAX_MILITARY_DEDUCTION_MONTHS,
    RECTIFICATION_BASE_YEAR,
    RECTIFICATION_END_YEAR,
    SENIOR_AGE_MIN,
    SENIOR_EXEMPTION_YEARS,
    SENIOR_REDUCTION_RATE,
    YOUTH_AGE_MAX,
    YOUTH_AGE_MIN,
    YOUTH_EXEMPTION_YEARS,
    YOUTH_REDUCTION_RATE,
)
from app.engines.common.tax_rates import (
    calc_progressive_tax,
    get_annual_limit,
    load_capital_gains_brackets,
    load_gift_tax_brackets,
    load_income_tax_brackets,
)

__all__ = [
    # Constants
    "YOUTH_REDUCTION_RATE",
    "SENIOR_REDUCTION_RATE",
    "YOUTH_EXEMPTION_YEARS",
    "SENIOR_EXEMPTION_YEARS",
    "ANNUAL_LIMIT_BEFORE_2023",
    "ANNUAL_LIMIT_2023_ONWARDS",
    "LOCAL_TAX_RATE",
    "MAX_MILITARY_DEDUCTION_MONTHS",
    "YOUTH_AGE_MIN",
    "YOUTH_AGE_MAX",
    "SENIOR_AGE_MIN",
    "RECTIFICATION_BASE_YEAR",
    "RECTIFICATION_END_YEAR",
    # Tax rate functions
    "load_income_tax_brackets",
    "load_capital_gains_brackets",
    "load_gift_tax_brackets",
    "calc_progressive_tax",
    "get_annual_limit",
]
