"""
Track 2 -- Property Transfer Tax Simulation engines.

Provides six-way comparison of property transfer strategies (양도/증여/부담부증여)
for two properties, evaluating both pre-policy (비중과) and post-policy (중과)
tax burdens.

Modules:
  - capital_gains: Capital gains tax (양도소득세) calculation
  - gift_tax: Gift tax (증여세) calculation
  - acquisition_tax: Acquisition tax (취득세) calculation
  - onerous_gift: Onerous gift (부담부증여) combined calculation
  - surcharge: Multi-house surcharge (중과) applicability
  - six_way_compare: Six-way scenario comparison engine
"""

from app.engines.track2.acquisition_tax import (
    AcquisitionTaxResult,
    calc_gift_acquisition_tax,
    calc_onerous_acquisition_tax,
)
from app.engines.track2.capital_gains import (
    CapitalGainsTaxResult,
    calc_capital_gains_tax,
    calc_long_term_deduction_rate,
)
from app.engines.track2.gift_tax import (
    GIFT_EXEMPTIONS,
    GiftTaxResult,
    calc_gift_tax,
)
from app.engines.track2.onerous_gift import (
    OnerousGiftResult,
    calc_onerous_gift,
)
from app.engines.track2.six_way_compare import (
    ScenarioDetail,
    SixWayInput,
    SixWayResult,
    calculate_six_way,
)
from app.engines.track2.surcharge import (
    is_surcharge_applicable,
)

__all__ = [
    # Six-way comparison (main entry point)
    "calculate_six_way",
    "SixWayInput",
    "SixWayResult",
    "ScenarioDetail",
    # Capital gains tax
    "calc_capital_gains_tax",
    "calc_long_term_deduction_rate",
    "CapitalGainsTaxResult",
    # Gift tax
    "calc_gift_tax",
    "GiftTaxResult",
    "GIFT_EXEMPTIONS",
    # Acquisition tax
    "calc_gift_acquisition_tax",
    "calc_onerous_acquisition_tax",
    "AcquisitionTaxResult",
    # Onerous gift
    "calc_onerous_gift",
    "OnerousGiftResult",
    # Surcharge
    "is_surcharge_applicable",
]
