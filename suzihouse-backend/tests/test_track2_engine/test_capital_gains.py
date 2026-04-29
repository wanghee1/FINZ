"""Unit tests for Track 2 capital gains tax engine."""

from app.engines.track2.capital_gains import calc_capital_gains_tax, calc_long_term_deduction_rate


class TestLongTermDeductionRate:
    def test_under_3_years(self):
        assert calc_long_term_deduction_rate(0) == 0.0
        assert calc_long_term_deduction_rate(1) == 0.0
        assert calc_long_term_deduction_rate(2) == 0.0

    def test_3_years(self):
        assert calc_long_term_deduction_rate(3) == 0.06

    def test_10_years(self):
        assert calc_long_term_deduction_rate(10) == 0.20

    def test_15_years_cap(self):
        assert calc_long_term_deduction_rate(15) == 0.30
        assert calc_long_term_deduction_rate(20) == 0.30


class TestCapitalGainsTaxNormal:
    """비중과 (non-surcharge) calculation."""

    def test_basic_gain(self):
        result = calc_capital_gains_tax(
            selling_price=1_000_000_000,   # 10억
            acquisition_price=500_000_000,  # 5억
            holding_years=5,
            is_surcharge=False,
        )
        assert result.gain == 500_000_000
        assert result.long_term_deduction > 0  # 5년 보유 → 10% 공제
        assert result.total_tax > 0
        assert result.local_tax > 0

    def test_no_gain(self):
        """No capital gain → zero tax."""
        result = calc_capital_gains_tax(
            selling_price=500_000_000,
            acquisition_price=600_000_000,
            holding_years=3,
            is_surcharge=False,
        )
        assert result.gain < 0 or result.total_tax == 0

    def test_with_expenses(self):
        result_no_exp = calc_capital_gains_tax(
            selling_price=1_000_000_000,
            acquisition_price=500_000_000,
            holding_years=5,
            is_surcharge=False,
        )
        result_with_exp = calc_capital_gains_tax(
            selling_price=1_000_000_000,
            acquisition_price=500_000_000,
            holding_years=5,
            is_surcharge=False,
            expenses=50_000_000,
        )
        assert result_with_exp.total_tax < result_no_exp.total_tax


class TestCapitalGainsTaxSurcharge:
    """중과 (surcharge) calculation."""

    def test_surcharge_higher(self):
        """Surcharge should produce higher tax than normal."""
        normal = calc_capital_gains_tax(
            selling_price=2_000_000_000,
            acquisition_price=800_000_000,
            holding_years=8,
            is_surcharge=False,
        )
        surcharge = calc_capital_gains_tax(
            selling_price=2_000_000_000,
            acquisition_price=800_000_000,
            holding_years=8,
            is_surcharge=True,
        )
        assert surcharge.total_tax > normal.total_tax

    def test_surcharge_no_long_term_deduction(self):
        """Surcharge should have zero long-term deduction."""
        result = calc_capital_gains_tax(
            selling_price=2_000_000_000,
            acquisition_price=800_000_000,
            holding_years=10,
            is_surcharge=True,
        )
        assert result.long_term_deduction == 0
