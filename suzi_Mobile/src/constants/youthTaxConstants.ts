/**
 * 중소기업 취업자 소득세 감면 관련 상수 (v2.3)
 * 세법 변경 시 이 파일의 설정값만 수정하면 로직 수정 없이 대응 가능
 *
 * 감면율·감면기간 → "최초 취업일" 기준 법령 적용
 * 연간 한도 → "해당 과세연도" 기준 법령 적용 (youthTaxCalculator.getAnnualLimit 참조)
 */
import { TaxReductionConfig, IneligibleReasonCode, MilitaryServiceType } from "../types";

/** 감면율·기간 설정 테이블 — 취업일 기준 (annualCap은 레거시, 실제는 과세연도 기준) */
export const YOUTH_TAX_REDUCTION_CONFIG: TaxReductionConfig[] = [
	{
		id: "config_2012",
		label: "2012~2013년 취업자",
		firstEmploymentStart: "2012-01-01",
		firstEmploymentEnd: "2013-12-31",
		reductionRate: 1.0,
		annualCap: 99999999999,
		maxPeriodYears: 3,
	},
	{
		id: "config_2014",
		label: "2014~2015년 취업자",
		firstEmploymentStart: "2014-01-01",
		firstEmploymentEnd: "2015-12-31",
		reductionRate: 0.5,
		annualCap: 1500000,
		maxPeriodYears: 3,
	},
	{
		id: "config_2016",
		label: "2016~2017년 취업자",
		firstEmploymentStart: "2016-01-01",
		firstEmploymentEnd: "2017-12-31",
		reductionRate: 0.7,
		annualCap: 1500000,
		maxPeriodYears: 5,
	},
	{
		id: "config_2018",
		label: "2018~2022년 취업자",
		firstEmploymentStart: "2018-01-01",
		firstEmploymentEnd: "2022-12-31",
		reductionRate: 0.9,
		annualCap: 1500000,
		maxPeriodYears: 5,
	},
	{
		id: "config_2023",
		label: "2023년 이후 취업자",
		firstEmploymentStart: "2023-01-01",
		firstEmploymentEnd: "2030-12-31",
		reductionRate: 0.9,
		annualCap: 2000000,
		maxPeriodYears: 5,
	},
];

/** 비대상 사유 코드 라벨 */
export const INELIGIBLE_REASON_LABELS: Record<IneligibleReasonCode, string> = {
	AGE_OVER: "연령 초과 (만 34세 초과)",
	AGE_UNDER: "연령 미달 (만 15세 미만)",
	NON_SME: "중소기업 아님",
	EXCLUDED_INDUSTRY: "감면 제외 업종",
	PERIOD_EXPIRED: "감면 적용 기간 경과",
	DEADLINE_EXPIRED: "경정청구 기한 초과",
	ZERO_DETERMINED_TAX: "산출세액 0원 (환급 불가)",
	MULTIPLE_NON_SME_EMPLOYER: "복수 사업장 중 비중소기업 존재",
	ALREADY_APPLIED: "감면 이미 적용됨",
	NOT_ELIGIBLE: "감면 대상 아님",
};

/** 복무 유형 라벨 */
export const MILITARY_SERVICE_TYPE_LABELS: Record<MilitaryServiceType, string> = {
	active: "현역",
	supplementary: "보충역 (사회복무요원 등)",
	officer: "장교",
	nco: "부사관",
	other: "기타",
};

/** 감면 제외 업종 코드 (조세특례제한법 시행령 기준) */
export const EXCLUDED_INDUSTRY_CODES: string[] = [
	"641",
	"642",
	"643",
	"649",
	"651",
	"652",
	"653",
	"659",
	"661",
	"662",
	"663",
	"711",
	"712",
	"713",
	"714",
];

/** 제외 업종 라벨 */
export const EXCLUDED_INDUSTRY_LABELS: Record<string, string> = {
	"641": "은행 및 저축기관 중개업",
	"651": "보험업",
	"711": "법무 관련 서비스업",
	"712": "회계 및 세무 관련 서비스업",
	"713": "시장 조사 및 여론 조사업",
	"714": "경영 컨설팅업",
};
