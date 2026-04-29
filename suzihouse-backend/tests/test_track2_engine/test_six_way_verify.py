"""
Track 2 6Way 검증 테스트 — 래미안파크팰리스 + 아크로리버뷰신반포

엑셀 스펙 (6Way_세금비교_2주택자_래미안_아크로.xlsx) 기대값 기반 정밀 검증.
엔진 계산 결과가 엑셀과 원 단위로 일치하는지 확인.

테스트 조건 (엑셀 기준):
  A = 래미안파크팰리스 (송파구 가락동 84.93㎡)
      시가 21.32억, 취득가 3.75억, 취득일 2005.1.1, 조정대상지역
      전세보증금 8억, 대출잔액 0
  B = 아크로리버뷰신반포 (서초구 잠원동 84.82㎡)
      시가 44.5억, 취득가 17.9억, 취득일 2018.12.28, 조정대상지역
      전세보증금 10.7억, 대출잔액 0
  수증자: 직계비속 성인 (자녀 1인)
  기준일: 2026.2.18
"""

from datetime import date

import pytest

from app.engines.track2.six_way_compare import SixWayInput, calculate_six_way


# ── 엑셀 정확 입력값 ──────────────────────────────

RAEMIAN_ACRO_INPUT = SixWayInput(
    a_market_price=2_132_000_000,         # 21.32억
    a_acquisition_price=375_000_000,      # 3.75억
    a_acquired_at=date(2005, 1, 1),
    a_is_regulated=True,
    a_lease_deposit=800_000_000,          # 8억
    a_loan_balance=0,
    b_market_price=4_450_000_000,         # 44.5억
    b_acquisition_price=1_790_000_000,    # 17.9억
    b_acquired_at=date(2018, 12, 28),
    b_is_regulated=True,
    b_lease_deposit=1_070_000_000,        # 10.7억
    b_loan_balance=0,
    donee_relation="LINEAL_DESCENDANT_ADULT",
    reference_date=date(2026, 2, 18),
)

# ── 엑셀 정확 기대값 (원 단위) ───────────────────

EXPECTED = {
    # ① 래미안 양도
    1: {
        "pre_cg": 535_029_000, "pre_gift": 0, "pre_acq": 0,
        "pre_total": 535_029_000,
        "post_cg": 1_181_933_500, "post_gift": 0, "post_acq": 0,
        "post_total": 1_181_933_500,
        "surcharge": 646_904_500,
    },
    # ② 래미안 증여
    2: {
        "pre_cg": 0, "pre_gift": 652_616_000, "pre_acq": 264_368_000,
        "pre_total": 916_984_000,
        "post_cg": 0, "post_gift": 652_616_000, "post_acq": 264_368_000,
        "post_total": 916_984_000,
        "surcharge": 0,
    },
    # ③ 래미안 부담부증여
    3: {
        "pre_cg": 173_426_412, "pre_gift": 342_216_000, "pre_acq": 191_568_000,
        "pre_total": 707_210_412,
        "post_cg": 408_394_771, "post_gift": 342_216_000, "post_acq": 191_568_000,
        "post_total": 942_178_771,
        "surcharge": 234_968_359,
    },
    # ④ 아크로 양도
    4: {
        "pre_cg": 1_058_590_500, "pre_gift": 0, "pre_acq": 0,
        "pre_total": 1_058_590_500,
        "post_cg": 1_827_578_500, "post_gift": 0, "post_acq": 0,
        "post_total": 1_827_578_500,
        "surcharge": 768_988_000,
    },
    # ⑤ 아크로 증여
    5: {
        "pre_cg": 0, "pre_gift": 1_687_800_000, "pre_acq": 551_800_000,
        "pre_total": 2_239_600_000,
        "post_cg": 0, "post_gift": 1_687_800_000, "post_acq": 551_800_000,
        "post_total": 2_239_600_000,
        "surcharge": 0,
    },
    # ⑥ 아크로 부담부증여
    6: {
        "pre_cg": 213_435_086, "pre_gift": 1_168_850_000, "pre_acq": 454_430_000,
        "pre_total": 1_836_715_086,
        "post_cg": 394_965_134, "post_gift": 1_168_850_000, "post_acq": 454_430_000,
        "post_total": 2_018_245_134,
        "surcharge": 181_530_048,
    },
}

# 허용 오차: 2원 (math.floor 반올림 차이)
MAX_DIFF = 2


class TestSixWayVerifyRaemianAcro:
    """래미안파크팰리스 + 아크로리버뷰신반포 엑셀 정밀 검증."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = calculate_six_way(RAEMIAN_ACRO_INPUT)

    def test_produces_6_scenarios(self):
        assert len(self.result.scenarios) == 6

    def test_scenario_structure(self):
        """각 시나리오가 올바른 target/method 조합."""
        expected_combos = {
            1: ("A", "SALE"),
            2: ("A", "GIFT"),
            3: ("A", "ONEROUS_GIFT"),
            4: ("B", "SALE"),
            5: ("B", "GIFT"),
            6: ("B", "ONEROUS_GIFT"),
        }
        for s in self.result.scenarios:
            target, method = expected_combos[s.scenario_no]
            assert s.target == target
            assert s.method == method

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_pre_capital_gains_tax(self, scenario_no):
        """비중과 양도소득세 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["pre_cg"]
        assert abs(s.pre_capital_gains_tax - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: pre_cg={s.pre_capital_gains_tax:,} vs expected={exp:,}"
        )

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_pre_gift_tax(self, scenario_no):
        """비중과 증여세 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["pre_gift"]
        assert abs(s.pre_gift_tax - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: pre_gift={s.pre_gift_tax:,} vs expected={exp:,}"
        )

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_pre_acquisition_tax(self, scenario_no):
        """비중과 취득세 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["pre_acq"]
        assert abs(s.pre_acquisition_tax - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: pre_acq={s.pre_acquisition_tax:,} vs expected={exp:,}"
        )

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_pre_total(self, scenario_no):
        """비중과 합계 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["pre_total"]
        assert abs(s.pre_total - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: pre_total={s.pre_total:,} vs expected={exp:,}"
        )

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_post_total(self, scenario_no):
        """중과 합계 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["post_total"]
        assert abs(s.post_total - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: post_total={s.post_total:,} vs expected={exp:,}"
        )

    @pytest.mark.parametrize("scenario_no", [1, 2, 3, 4, 5, 6])
    def test_surcharge_increase(self, scenario_no):
        """중과 증가분 정밀 일치."""
        s = next(x for x in self.result.scenarios if x.scenario_no == scenario_no)
        exp = EXPECTED[scenario_no]["surcharge"]
        assert abs(s.surcharge_increase - exp) <= MAX_DIFF, (
            f"Scenario {scenario_no}: surcharge={s.surcharge_increase:,} vs expected={exp:,}"
        )

    def test_gift_scenarios_same_pre_post(self):
        """증여 시나리오(②, ⑤)는 비중과/중과 동일 (중과 무관)."""
        for s in self.result.scenarios:
            if s.method == "GIFT":
                assert s.pre_total == s.post_total

    def test_optimal_pre_is_scenario_1(self):
        """비중과 기준 최적은 ① 래미안 양도."""
        assert self.result.optimal_pre == 1

    def test_rankings_complete(self):
        """순위가 6개이고, 1~6을 모두 포함."""
        assert sorted(self.result.rank_pre) == [1, 2, 3, 4, 5, 6]
        assert sorted(self.result.rank_post) == [1, 2, 3, 4, 5, 6]

    def test_risk_delta(self):
        """risk_delta = max(post_total) - min(pre_total)."""
        max_post = max(s.post_total for s in self.result.scenarios)
        min_pre = min(s.pre_total for s in self.result.scenarios)
        assert self.result.risk_delta == max_post - min_pre
        # 엑셀 기대값: 2,239,600,000 - 535,029,000 = 1,704,571,000
        assert abs(self.result.risk_delta - 1_704_571_000) <= MAX_DIFF

    def test_acquisition_tax_details(self):
        """취득세 세부 검증 — 엑셀 시트별 정확한 값."""
        # ② 래미안 증여: 취득세 12.4% * 21.32억 = 264,368,000
        s2 = next(x for x in self.result.scenarios if x.scenario_no == 2)
        assert s2.pre_acquisition_tax == 264_368_000

        # ③ 래미안 부담부: 증여분 12.4% * (21.32억-8억) + 유상분 3.3% * 8억
        # = 165,168,000 + 26,400,000 = 191,568,000
        s3 = next(x for x in self.result.scenarios if x.scenario_no == 3)
        assert s3.pre_acquisition_tax == 191_568_000

        # ⑤ 아크로 증여: 취득세 12.4% * 44.5억 = 551,800,000
        s5 = next(x for x in self.result.scenarios if x.scenario_no == 5)
        assert s5.pre_acquisition_tax == 551_800_000

        # ⑥ 아크로 부담부: 증여분 12.4% * (44.5억-10.7억) + 유상분 3.3% * 10.7억
        # = 419,120,000 + 35,310,000 = 454,430,000
        s6 = next(x for x in self.result.scenarios if x.scenario_no == 6)
        assert s6.pre_acquisition_tax == 454_430_000
