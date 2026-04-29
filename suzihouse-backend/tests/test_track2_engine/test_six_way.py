"""Unit tests for Track 2 six-way comparison engine."""

from datetime import date

from app.engines.track2.six_way_compare import SixWayInput, calculate_six_way


class TestSixWayBasic:
    """Basic 6-way comparison tests."""

    def test_produces_6_scenarios(self):
        inputs = SixWayInput(
            a_market_price=2_800_000_000,
            a_acquisition_price=1_500_000_000,
            a_acquired_at=date(2018, 6, 1),
            a_is_regulated=True,
            a_lease_deposit=500_000_000,
            a_loan_balance=200_000_000,
            b_market_price=5_500_000_000,
            b_acquisition_price=2_800_000_000,
            b_acquired_at=date(2016, 3, 15),
            b_is_regulated=True,
            b_lease_deposit=1_000_000_000,
            b_loan_balance=500_000_000,
            donee_relation="LINEAL_DESCENDANT_ADULT",
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        assert len(result.scenarios) == 6
        assert len(result.rank_pre) == 6
        assert len(result.rank_post) == 6

    def test_scenario_labels(self):
        inputs = SixWayInput(
            a_market_price=1_000_000_000,
            a_acquisition_price=500_000_000,
            a_acquired_at=date(2020, 1, 1),
            a_is_regulated=True,
            b_market_price=2_000_000_000,
            b_acquisition_price=1_000_000_000,
            b_acquired_at=date(2019, 1, 1),
            b_is_regulated=True,
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        methods = [s.method for s in result.scenarios]
        assert "SALE" in methods
        assert "GIFT" in methods
        assert "ONEROUS_GIFT" in methods

        targets = [s.target for s in result.scenarios]
        assert "A" in targets
        assert "B" in targets

    def test_gift_no_surcharge_increase(self):
        """Gift tax is unaffected by surcharge → increase = 0."""
        inputs = SixWayInput(
            a_market_price=1_500_000_000,
            a_acquisition_price=800_000_000,
            a_acquired_at=date(2018, 1, 1),
            a_is_regulated=True,
            b_market_price=3_000_000_000,
            b_acquisition_price=1_500_000_000,
            b_acquired_at=date(2017, 1, 1),
            b_is_regulated=True,
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        gift_scenarios = [s for s in result.scenarios if s.method == "GIFT"]
        for s in gift_scenarios:
            assert s.surcharge_increase == 0

    def test_sale_surcharge_increases(self):
        """Sale with surcharge should cost more than without."""
        inputs = SixWayInput(
            a_market_price=2_000_000_000,
            a_acquisition_price=800_000_000,
            a_acquired_at=date(2018, 1, 1),
            a_is_regulated=True,
            b_market_price=3_000_000_000,
            b_acquisition_price=1_200_000_000,
            b_acquired_at=date(2017, 1, 1),
            b_is_regulated=True,
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        sale_scenarios = [s for s in result.scenarios if s.method == "SALE"]
        for s in sale_scenarios:
            assert s.surcharge_increase > 0
            assert s.post_total > s.pre_total

    def test_optimal_is_minimum(self):
        """Optimal scenario should have the minimum total."""
        inputs = SixWayInput(
            a_market_price=2_000_000_000,
            a_acquisition_price=1_000_000_000,
            a_acquired_at=date(2019, 1, 1),
            a_is_regulated=True,
            b_market_price=4_000_000_000,
            b_acquisition_price=2_000_000_000,
            b_acquired_at=date(2018, 1, 1),
            b_is_regulated=True,
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        # optimal_pre should be the scenario with lowest pre_total
        optimal = next(s for s in result.scenarios if s.scenario_no == result.optimal_pre)
        for s in result.scenarios:
            assert s.pre_total >= optimal.pre_total

    def test_risk_delta(self):
        """risk_delta = max(post_total) - min(pre_total)."""
        inputs = SixWayInput(
            a_market_price=1_500_000_000,
            a_acquisition_price=700_000_000,
            a_acquired_at=date(2019, 6, 1),
            a_is_regulated=True,
            b_market_price=2_500_000_000,
            b_acquisition_price=1_200_000_000,
            b_acquired_at=date(2018, 3, 1),
            b_is_regulated=True,
            reference_date=date(2026, 3, 1),
        )
        result = calculate_six_way(inputs)

        max_post = max(s.post_total for s in result.scenarios)
        min_pre = min(s.pre_total for s in result.scenarios)
        assert result.risk_delta == max_post - min_pre
