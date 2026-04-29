"""
CODEF API response parsers.

Transforms raw CODEF JSON responses into structured internal data models
for Track 1 calculation pipeline.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ═════════════════════════════════════════════════════════════════════════════
# Parsed data structures
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class ParsedPaystatement:
    """근로소득 지급명세서 파싱 결과."""
    attr_year: int = 0                      # 귀속연도
    total_salary: int = 0                   # 총급여
    earned_income_amount: int = 0           # 근로소득금액
    other_income_amount: int = 0            # 기타소득 (종합소득 중 근로 외)
    calculated_tax: int = 0                 # 산출세액
    wage_tax_credit_before_red: int = 0     # 근로소득세액공제
    reported_reduction: int = 0             # 기신고 청년감면세액
    reported_final_tax: int = 0             # 결정세액
    income_tax: int = 0                     # 소득세 (세액명세)
    local_income_tax: int = 0              # 지방소득세 (세액명세)
    company_name: str = ""                  # 회사명 (징수의무자)
    company_reg_no: str = ""                # 사업자등록번호
    salary_from_sme: int = 0                # 중소기업 급여 (기본: total_salary)
    year_end_adj_type: str = ""             # 연말정산구분 (1:계속, 2:중도퇴사)
    raw_data: dict = field(default_factory=dict)


@dataclass
class EmploymentRecord:
    """근로자 고용정보현황 파싱 결과."""
    name: str = ""
    identity_no: str = ""
    join_date: str = ""                     # YYYYMMDD (고용보험 기준)
    resign_date: str = ""                   # YYYYMMDD or ""
    employment_status: str = ""             # "고용", "고용종료"
    job_type: str = ""                      # 직종
    average_amount: int = 0                 # 월평균보수 (고용보험)
    worker_type: str = ""                   # "일반근로자" 등


# ═════════════════════════════════════════════════════════════════════════════
# 근로소득 지급명세서 Parser
# ═════════════════════════════════════════════════════════════════════════════

class PaystatementParser:
    """CODEF 근로소득 지급명세서 응답 → ParsedPaystatement 변환."""

    def parse(self, raw_data: dict) -> ParsedPaystatement:
        """CODEF data 객체를 파싱하여 구조화된 결과 반환."""
        result = ParsedPaystatement(raw_data=raw_data)

        # 귀속연도
        result.attr_year = _safe_int(raw_data.get("resAttrYear", "0"))

        # 징수의무자 (회사) 정보 — try multiple field name patterns
        result.company_name = (
            raw_data.get("resCompanyNm1", "")
            or raw_data.get("resCompanyNm", "")
            or raw_data.get("commCompanyName", "")
        )
        result.company_reg_no = (
            raw_data.get("resCompanyIdentityNo1", "")
            or raw_data.get("resCompanyIdentityNo", "")
        )
        result.year_end_adj_type = raw_data.get("resYETaxAdjType", "")

        # 로그: 응답 구조 확인
        top_keys = [k for k in raw_data.keys() if k.startswith("res") or k.startswith("comm")]
        logger.info(
            "CODEF parse: year=%s company=%s top_keys=%s",
            result.attr_year, result.company_name, top_keys[:20],
        )

        # 소득명세 파싱
        income_spec_list = raw_data.get("resIncomeSpecList", [])
        logger.info("  resIncomeSpecList: %d items", len(income_spec_list))
        self._parse_income_spec(income_spec_list, result)

        # 정산명세 파싱 (핵심 세액 데이터)
        settlement_list = raw_data.get("resSettlementSpecList", [])
        logger.info("  resSettlementSpecList: %d items", len(settlement_list))
        self._parse_settlement_spec(settlement_list, result)

        # 세액명세 파싱
        tax_spec_list = raw_data.get("resTaxAmtSpecList", [])
        logger.info("  resTaxAmtSpecList: %d items", len(tax_spec_list))
        self._parse_tax_spec(tax_spec_list, result)

        # 중소기업 급여 기본값: 총급여와 동일 (사용자가 수정 가능)
        if result.salary_from_sme == 0:
            result.salary_from_sme = result.total_salary

        logger.info(
            "  PARSED RESULT: total_salary=%d earned_income=%d "
            "calculated_tax=%d wage_credit=%d final_tax=%d reduction=%d",
            result.total_salary, result.earned_income_amount,
            result.calculated_tax, result.wage_tax_credit_before_red,
            result.reported_final_tax, result.reported_reduction,
        )

        return result

    def _parse_income_spec(
        self, income_spec_list: list[dict], result: ParsedPaystatement
    ) -> None:
        """소득명세 리스트 파싱.

        CODEF resType 형식: 'Ⅰ근무처별소득명세|13:급여', 'Ⅱ비과세및감면소득명세|20:비과세소득+계'
        파이프(|) 구분자 뒤의 항목번호:항목명으로 매칭합니다.
        """
        salary_subtotal = 0  # 16:계 (급여+상여+인정상여 합계)

        # 디버깅: 모든 resType 로깅
        all_types = [item.get("resType", "") for item in income_spec_list]
        logger.info("  IncomeSpec resTypes: %s", all_types)

        for item in income_spec_list:
            res_type = item.get("resType", "").strip()
            master_val = _safe_int(item.get("resMaster", "0"))
            total_val = _safe_int(item.get("resTotalAmount", "0"))
            # resServant1, resServant2 도 값이 될 수 있음
            servant1_val = _safe_int(item.get("resServant1", "0"))
            servant2_val = _safe_int(item.get("resServant2", "0"))
            val = total_val or master_val or servant1_val

            # 항목번호 추출 (파이프 뒤, 콜론 앞)
            item_num = ""
            if "|" in res_type:
                after_pipe = res_type.split("|")[-1]
                if ":" in after_pipe:
                    item_num = after_pipe.split(":")[0].strip()

            # 16:계 = 근무처별 소득명세 합계
            if "16:" in res_type and ("계" in res_type or item_num == "16"):
                salary_subtotal = val
                logger.info("  IncomeSpec matched 16:계 → %d", val)
            elif "근로소득금액" in res_type:
                result.earned_income_amount = val
                logger.info("  IncomeSpec matched 근로소득금액 → %d", val)

            # 디버그: 값이 있는 항목 로깅
            if val > 0:
                logger.debug(
                    "  IncomeSpec item: type=%s val=%d (master=%d total=%d)",
                    res_type, val, master_val, total_val,
                )

        # 소득명세의 16:계를 fallback 총급여로 저장 (정산명세 21번이 우선)
        if salary_subtotal and result.total_salary == 0:
            result.total_salary = salary_subtotal

    def _parse_settlement_spec(
        self, settlement_list: list[dict], result: ParsedPaystatement
    ) -> None:
        """정산명세 리스트 파싱 (Track 1 계산에 필요한 핵심 데이터).

        CODEF resType 형식 예시:
        - 'Ⅳ정산명세|21:총급여(16,...)'          → total_salary
        - 'Ⅳ정산명세|23:근로소득금액'              → earned_income_amount
        - 'Ⅳ정산명세|49:산출세액'                 → calculated_tax
        - 'Ⅳ정산명세|세액감면|52:「조세특례제한법」+제30조' → reported_reduction
        - 'Ⅳ정산명세|세액공제|55:근로소득'          → wage_tax_credit_before_red
        - 'Ⅳ정산명세|71:결정세액(49-54-70)'       → reported_final_tax

        항목번호(21:, 49:, 55:, 71: 등)로 매칭합니다.
        """
        # 디버깅: 첫 항목의 전체 필드 구조 확인
        if settlement_list:
            first_item = settlement_list[0]
            logger.info("  SettlementSpec item[0] keys: %s", list(first_item.keys()))
            logger.info("  SettlementSpec item[0] full: %s", first_item)

        # 디버깅: 모든 resType 로깅
        all_types = [item.get("resType", "") for item in settlement_list]
        logger.info("  SettlementSpec resTypes (%d): %s", len(all_types), all_types[:30])
        if len(all_types) > 30:
            logger.info("  SettlementSpec resTypes (cont): %s", all_types[30:60])
            if len(all_types) > 60:
                logger.info("  SettlementSpec resTypes (cont2): %s", all_types[60:])

        # 항목 필드명: resAmount가 기본, 없으면 다른 필드 시도
        for item in settlement_list:
            res_type = item.get("resType", "").strip()

            # resAmount 외에도 다양한 필드명 시도
            amount = _safe_int(item.get("resAmount", "0"))
            if amount == 0:
                # CODEF 응답에서 다른 금액 필드명도 체크
                amount = _safe_int(item.get("resMaster", "0"))
            if amount == 0:
                amount = _safe_int(item.get("resTotalAmount", "0"))

            # 항목번호 추출 (마지막 파이프 뒤, 콜론 앞 숫자)
            item_num = _extract_item_number(res_type)

            # [21] 총급여
            if item_num == "21" or ("21:" in res_type and "총급여" in res_type):
                if amount:
                    result.total_salary = amount
                    logger.info("  Settlement matched [21] 총급여 → %d (type=%s)", amount, res_type)

            # [23] 근로소득금액
            elif item_num == "23" or ("23:" in res_type and "근로소득금액" in res_type):
                if amount:
                    result.earned_income_amount = amount
                    logger.info("  Settlement matched [23] 근로소득금액 → %d", amount)

            # [49] 산출세액
            elif item_num == "49" or ("49:" in res_type and "산출세액" in res_type):
                if amount:
                    result.calculated_tax = amount
                    logger.info("  Settlement matched [49] 산출세액 → %d", amount)

            # [52] 조세특례제한법 제30조 = 중소기업 청년 소득세 감면
            elif ("52:" in res_type and "제30조" in res_type) or (
                item_num == "52" and "조세특례" in res_type
            ):
                if amount:
                    result.reported_reduction = amount
                    logger.info("  Settlement matched [52] 감면 → %d", amount)

            # [51] 조세특례제한법 (52 제외) — fallback for 감면
            elif "51:" in res_type and "조세특례제한법" in res_type:
                if result.reported_reduction == 0 and amount:
                    result.reported_reduction = amount

            # [55] 근로소득 세액공제
            elif item_num == "55" or ("55:" in res_type and "근로소득" in res_type):
                if amount:
                    result.wage_tax_credit_before_red = amount
                    logger.info("  Settlement matched [55] 근로소득세액공제 → %d", amount)

            # [71] 결정세액
            elif item_num == "71" or ("71:" in res_type and "결정세액" in res_type):
                if amount:
                    result.reported_final_tax = amount
                    logger.info("  Settlement matched [71] 결정세액 → %d", amount)

            # 디버그: 금액이 있는 매칭되지 않은 항목
            elif amount > 0:
                logger.debug(
                    "  Settlement unmatched: type=%s amount=%d item_num=%s",
                    res_type, amount, item_num,
                )

    def _parse_tax_spec(
        self, tax_spec_list: list[dict], result: ParsedPaystatement
    ) -> None:
        """세액명세 리스트에서 소득세/지방소득세 추출.

        resTaxAmtSpecList에서:
        - resIncomeTax → 소득세
        - resLocalIncomeTax → 지방소득세
        "결정세액" 또는 "차감징수세액" 행에서 추출 (부분 매칭)
        """
        for item in tax_spec_list:
            res_type = item.get("resType", "").strip()
            # 결정세액 또는 차감징수세액 행 (부분 매칭)
            if "결정세액" in res_type or "차감징수세액" in res_type or res_type == "":
                income_tax = _safe_int(item.get("resIncomeTax", "0"))
                local_tax = _safe_int(item.get("resLocalIncomeTax", "0"))
                if income_tax:
                    result.income_tax = income_tax
                if local_tax:
                    result.local_income_tax = local_tax


# ═════════════════════════════════════════════════════════════════════════════
# 근로자 고용정보현황 Parser
# ═════════════════════════════════════════════════════════════════════════════

class EmploymentParser:
    """CODEF 근로자 고용정보현황 응답 파서."""

    def parse(self, raw_data: list | dict) -> list[EmploymentRecord]:
        """고용정보 리스트 파싱. 단건이면 리스트로 감싼다."""
        if isinstance(raw_data, dict):
            raw_data = [raw_data]

        records = []
        for item in raw_data:
            record = EmploymentRecord(
                name=item.get("resUserNm", ""),
                identity_no=item.get("resUserIdentiyNo", ""),
                join_date=item.get("resJoinCompanyDate1", "")
                    or item.get("resJoinCompanyDate", ""),
                resign_date=item.get("resResignDate1", "")
                    or item.get("resResignDate", ""),
                employment_status=item.get("resEmploymentStatus1", "")
                    or item.get("resEmploymentStatus", ""),
                job_type=item.get("resJobType", ""),
                average_amount=_safe_int(
                    item.get("resAverageAmt2", "0")
                    or item.get("resAverageAmt1", "0")
                ),
                worker_type=item.get("resType", ""),
            )
            records.append(record)

        return records

    def find_earliest_join_date(self, records: list[EmploymentRecord]) -> str:
        """모든 고용 기록에서 가장 이른 입사일(YYYYMMDD) 반환."""
        dates = [r.join_date for r in records if r.join_date]
        return min(dates) if dates else ""


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

def _extract_item_number(res_type: str) -> str:
    """resType에서 항목번호 추출.

    예: 'Ⅳ정산명세|21:총급여(16,...)' → '21'
        'Ⅳ정산명세|세액감면|52:「조세특례제한법」' → '52'
        '21:총급여' → '21'
    """
    # 마지막 파이프 이후의 부분에서 콜론 앞 숫자 추출
    part = res_type.split("|")[-1].strip() if "|" in res_type else res_type.strip()
    if ":" in part:
        num_part = part.split(":")[0].strip()
        # 숫자만 추출
        digits = "".join(c for c in num_part if c.isdigit())
        return digits
    return ""


def _safe_int(value: str | int | None) -> int:
    """문자열 → int 안전 변환. 쉼표, 공백 제거."""
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    cleaned = str(value).replace(",", "").replace(" ", "").strip()
    if not cleaned or cleaned == "-":
        return 0
    try:
        return int(cleaned)
    except ValueError:
        try:
            return int(float(cleaned))
        except ValueError:
            logger.warning("Cannot parse int from: %r", value)
            return 0
