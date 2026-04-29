"""Unit tests for Track 1 eligibility engine."""

from datetime import date

from app.engines.track1.eligibility import judge_eligibility


class TestYouthEligibility:
    def test_youth_basic(self):
        """Basic youth case: age 28, hired in 2022"""
        result = judge_eligibility(
            birth_date=date(1996, 3, 15),
            gender="M",
            first_sme_hire_date=date(2022, 3, 1),
            military_months=0,
        )
        assert result.employment_type == "YOUTH"
        assert result.reduction_rate == 0.9
        assert result.exemption_years == 5
        # 2022-2024 should be eligible (within 5-year window)
        assert result.eligible_years.get(2022) is True
        assert result.eligible_years.get(2023) is True
        assert result.eligible_years.get(2024) is True

    def test_youth_with_military(self):
        """Male age 36 with 24 months military → tax age 34.0 → YOUTH"""
        result = judge_eligibility(
            birth_date=date(1988, 5, 1),
            gender="M",
            first_sme_hire_date=date(2024, 6, 1),
            military_months=24,
        )
        assert result.employment_type == "YOUTH"

    def test_not_eligible_age_36(self):
        """Age 36 female → NONE"""
        result = judge_eligibility(
            birth_date=date(1988, 1, 1),
            gender="F",
            first_sme_hire_date=date(2024, 6, 1),
            military_months=0,
        )
        assert result.employment_type == "NONE"


class TestSeniorEligibility:
    def test_senior_basic(self):
        """Age 62 → SENIOR"""
        result = judge_eligibility(
            birth_date=date(1962, 3, 1),
            gender="M",
            first_sme_hire_date=date(2024, 6, 1),
            military_months=0,
        )
        assert result.employment_type == "SENIOR"
        assert result.reduction_rate == 0.7
        assert result.exemption_years == 3


class TestExemptionPeriod:
    def test_5year_window(self):
        """Hired 2019-01-01 → exemption 2019-2023 → eligible 2020-2023"""
        result = judge_eligibility(
            birth_date=date(1995, 6, 1),
            gender="F",
            first_sme_hire_date=date(2019, 1, 1),
            military_months=0,
        )
        assert result.employment_type == "YOUTH"
        assert result.eligible_years.get(2020) is True
        assert result.eligible_years.get(2023) is True
        # 2024 should NOT be eligible (exemption ends 2023-12-31)
        assert result.eligible_years.get(2024) is False

    def test_hired_before_window(self):
        """Hired 2014 → exemption 2014-2018 → no eligible years in 2020-2024"""
        result = judge_eligibility(
            birth_date=date(1992, 1, 1),
            gender="F",
            first_sme_hire_date=date(2014, 1, 1),
            military_months=0,
        )
        # All years 2020-2024 should be False
        for year in range(2020, 2025):
            assert result.eligible_years.get(year) is False
