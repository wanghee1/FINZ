"""Unit tests for Track 1 tax age calculation engine."""

from datetime import date

from app.engines.track1.tax_age import (
    calc_age,
    calc_military_months,
    calc_tax_age,
    needs_military_doc,
)


class TestCalcAge:
    def test_basic_age(self):
        assert calc_age(date(1990, 6, 15), date(2024, 7, 1)) == 34

    def test_birthday_not_passed(self):
        assert calc_age(date(1990, 6, 15), date(2024, 5, 1)) == 33

    def test_birthday_same_day(self):
        assert calc_age(date(1990, 6, 15), date(2024, 6, 15)) == 34

    def test_zero_age(self):
        assert calc_age(date(2024, 1, 1), date(2024, 6, 1)) == 0


class TestCalcMilitaryMonths:
    def test_typical_service(self):
        # 18 months
        assert calc_military_months(date(2010, 3, 1), date(2011, 9, 1)) == 18

    def test_21_months(self):
        assert calc_military_months(date(2010, 1, 5), date(2011, 10, 4)) == 21

    def test_max_cap_72(self):
        # 7 years = 84 months, should cap at 72
        assert calc_military_months(date(2000, 1, 1), date(2007, 1, 1)) == 72


class TestCalcTaxAge:
    def test_male_with_military(self):
        # Age 36 - 21/12 = 34.25 (youth eligible)
        tax_age = calc_tax_age(date(1988, 5, 1), date(2024, 6, 1), 21, "M")
        assert 34.0 <= tax_age <= 35.0

    def test_female_no_military_deduction(self):
        tax_age = calc_tax_age(date(1990, 1, 1), date(2024, 6, 1), 18, "F")
        # Military months should NOT be deducted for female
        assert tax_age == 34.0

    def test_male_no_military(self):
        tax_age = calc_tax_age(date(1990, 1, 1), date(2024, 6, 1), 0, "M")
        assert tax_age == 34.0


class TestNeedsMilitaryDoc:
    def test_male_age_35(self):
        assert needs_military_doc(date(1989, 6, 1), date(2024, 6, 1), "M") is True

    def test_male_age_34(self):
        assert needs_military_doc(date(1990, 6, 1), date(2024, 6, 1), "M") is False

    def test_female(self):
        assert needs_military_doc(date(1988, 1, 1), date(2024, 6, 1), "F") is False

    def test_male_age_41(self):
        assert needs_military_doc(date(1983, 1, 1), date(2024, 6, 1), "M") is False
