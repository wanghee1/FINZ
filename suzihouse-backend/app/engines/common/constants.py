"""
Common tax constants loaded from config/tax_params.json.

All monetary amounts are in Korean won (원).
"""

import json
from pathlib import Path

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "config"


def _load_tax_params() -> dict:
    """Load tax_params.json from the config directory."""
    path = _CONFIG_DIR / "tax_params.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


_params = _load_tax_params()

# ── Reduction rates ──────────────────────────────────────────────────
YOUTH_REDUCTION_RATE: float = _params["youth_reduction_rate"]       # 0.90
SENIOR_REDUCTION_RATE: float = _params["senior_reduction_rate"]     # 0.70

# ── Exemption durations (years) ──────────────────────────────────────
YOUTH_EXEMPTION_YEARS: int = _params["youth_exemption_years"]       # 5
SENIOR_EXEMPTION_YEARS: int = _params["senior_exemption_years"]     # 3

# ── Annual reduction limits (원) ─────────────────────────────────────
ANNUAL_LIMIT_BEFORE_2023: int = _params["annual_limit_before_2023"]  # 1,500,000
ANNUAL_LIMIT_2023_ONWARDS: int = _params["annual_limit_2023_onwards"]  # 2,000,000

# ── Local income tax rate ────────────────────────────────────────────
LOCAL_TAX_RATE: float = _params["local_tax_rate"]                   # 0.10

# ── Military service ────────────────────────────────────────────────
MAX_MILITARY_DEDUCTION_MONTHS: int = _params["max_military_deduction_months"]  # 72

# ── Age thresholds ──────────────────────────────────────────────────
YOUTH_AGE_MIN: int = _params["youth_age_min"]                       # 15
YOUTH_AGE_MAX: int = _params["youth_age_max"]                       # 34
SENIOR_AGE_MIN: int = _params["senior_age_min"]                     # 60

# ── Rectification period ────────────────────────────────────────────
RECTIFICATION_BASE_YEAR: int = _params["rectification_base_year"]   # 2020
RECTIFICATION_END_YEAR: int = _params["rectification_end_year"]     # 2024
