"""Unit tests for Track 1 reduction calculation (Case A and B)."""

from app.engines.track1.reduction_simple import InputYearData, compute_reduction_simple
from app.engines.track1.reduction_complex import compute_reduction_complex


class TestReductionSimple:
    """Case A: Single source SME income."""

    def test_basic_reduction_90(self):
        """Basic 90% youth reduction."""
        data = InputYearData(
            year=2023,
            reduction_rate=0.9,
            calculated_tax=3_000_000,
            wage_tax_credit_before_red=500_000,
            originally_reported_reduction=0,
            originally_reported_final_tax=2_500_000,
            total_salary=40_000_000,
            salary_from_sme=40_000_000,
            earned_income_amount=28_000_000,
            other_income_amount=0,
        )
        result = compute_reduction_simple(data)

        assert result.calc_case == "SIMPLE"
        # raw = 3,000,000 * 0.9 = 2,700,000
        assert result.raw_reduction == 2_700_000
        # limit for 2023 = 2,000,000
        assert result.annual_limit == 2_000_000
        # reduction = min(2,700,000, 2,000,000) = 2,000,000
        assert result.reduction_amount == 2_000_000
        # final tax >= 0
        assert result.corrected_final_tax >= 0

    def test_reduction_below_limit(self):
        """Reduction below annual limit."""
        data = InputYearData(
            year=2022,
            reduction_rate=0.9,
            calculated_tax=1_000_000,
            wage_tax_credit_before_red=200_000,
            originally_reported_reduction=0,
            originally_reported_final_tax=800_000,
            total_salary=30_000_000,
            salary_from_sme=30_000_000,
            earned_income_amount=20_000_000,
            other_income_amount=0,
        )
        result = compute_reduction_simple(data)

        # raw = 1,000,000 * 0.9 = 900,000
        # limit for 2022 = 1,500,000
        # reduction = min(900,000, 1,500,000) = 900,000
        assert result.reduction_amount == 900_000
        assert result.annual_limit == 1_500_000

    def test_zero_tax(self):
        """Zero calculated tax → zero reduction."""
        data = InputYearData(
            year=2023,
            reduction_rate=0.9,
            calculated_tax=0,
            wage_tax_credit_before_red=0,
            originally_reported_reduction=0,
            originally_reported_final_tax=0,
        )
        result = compute_reduction_simple(data)
        assert result.reduction_amount == 0
        assert result.corrected_final_tax == 0

    def test_wage_credit_readjustment(self):
        """Verify wage credit is readjusted proportionally."""
        data = InputYearData(
            year=2023,
            reduction_rate=0.9,
            calculated_tax=4_000_000,
            wage_tax_credit_before_red=600_000,
            originally_reported_reduction=0,
            originally_reported_final_tax=3_400_000,
            total_salary=50_000_000,
            salary_from_sme=50_000_000,
            earned_income_amount=35_000_000,
            other_income_amount=0,
        )
        result = compute_reduction_simple(data)

        # reduction = min(3,600,000, 2,000,000) = 2,000,000
        # wage_credit_after = 600,000 * (1 - 2,000,000/4,000,000) = 300,000
        assert result.wage_credit_after == 300_000


class TestReductionComplex:
    """Case B: Comprehensive income with proportional allocation."""

    def test_with_other_income(self):
        """Has other income → proportional calculation."""
        data = InputYearData(
            year=2023,
            reduction_rate=0.9,
            calculated_tax=5_000_000,
            wage_tax_credit_before_red=400_000,
            originally_reported_reduction=0,
            originally_reported_final_tax=4_600_000,
            total_salary=50_000_000,
            salary_from_sme=50_000_000,
            earned_income_amount=35_000_000,
            other_income_amount=10_000_000,
        )
        result = compute_reduction_complex(data)

        assert result.calc_case == "COMPLEX"
        # ratio1 = 35,000,000 / 45,000,000 ≈ 0.7778
        # ratio2 = 50,000,000 / 50,000,000 = 1.0
        # raw = 5,000,000 * 0.7778 * 1.0 * 0.9 ≈ 3,500,000
        assert result.raw_reduction > 0
        assert result.reduction_amount <= result.annual_limit

    def test_partial_sme_salary(self):
        """Only part of salary from SME."""
        data = InputYearData(
            year=2023,
            reduction_rate=0.9,
            calculated_tax=4_000_000,
            wage_tax_credit_before_red=300_000,
            originally_reported_reduction=0,
            originally_reported_final_tax=3_700_000,
            total_salary=60_000_000,
            salary_from_sme=30_000_000,
            earned_income_amount=42_000_000,
            other_income_amount=0,
        )
        result = compute_reduction_complex(data)

        # ratio2 = 30,000,000 / 60,000,000 = 0.5
        assert result.raw_reduction < 4_000_000 * 0.9  # Less than full
