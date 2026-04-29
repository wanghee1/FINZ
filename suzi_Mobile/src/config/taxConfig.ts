/**
 * 종합부동산세 시뮬레이션 설정 파일
 *
 * FR-RE-A-20-03: 세율·공제·공정시장가액비율 등은 설정 파일 기반으로 관리
 * 세법 변경 시 로직 수정 없이 이 파일의 설정값 변경으로 대응 가능
 *
 * IN-RE-01: 표준 템플릿 금액도 설정 파일 기반으로 관리
 */

// ── 타입 정의 ──────────────────────────────────

export interface TaxBracket {
	min: number;
	max: number;
	rate: number;
	progressiveDeduction: number;
}

export interface AgeDeductionTier {
	minAge: number;
	maxAge: number;
	rate: number;
}

export interface HoldingDeductionTier {
	minYears: number;
	maxYears: number;
	rate: number;
}

// ── 설정 본체 ──────────────────────────────────

export const TAX_CONFIG = {
	/** 적용 기준 연도 (DR-RE-05-03) */
	baseYear: 2026,

	/** 공시가격 기준일 (DR-RE-05-03) */
	officialPriceBaseDate: "2026.01.01",

	/** 과세기준일 */
	taxAssessmentDate: "06.01",

	// ─── 공정시장가액비율 ───
	/** 종부세 공정시장가액비율 */
	fairMarketValueRatio: 0.6,

	// ─── 기본공제 ───
	basicDeduction: {
		/** 1세대 1주택자: 12억 */
		singleHomeOwner: 1_200_000_000,
		/** 일반(다주택): 9억 */
		general: 900_000_000,
	},

	// ─── 종부세 세율 (일반 / 2주택 이하) ───
	generalTaxBrackets: [
		{ min: 0, max: 300_000_000, rate: 0.005, progressiveDeduction: 0 },
		{ min: 300_000_000, max: 600_000_000, rate: 0.007, progressiveDeduction: 600_000 },
		{ min: 600_000_000, max: 1_200_000_000, rate: 0.01, progressiveDeduction: 2_400_000 },
		{ min: 1_200_000_000, max: 2_500_000_000, rate: 0.013, progressiveDeduction: 6_000_000 },
		{ min: 2_500_000_000, max: 5_000_000_000, rate: 0.015, progressiveDeduction: 11_000_000 },
		{ min: 5_000_000_000, max: 9_400_000_000, rate: 0.02, progressiveDeduction: 36_000_000 },
		{ min: 9_400_000_000, max: Infinity, rate: 0.027, progressiveDeduction: 91_800_000 },
	] as TaxBracket[],

	// ─── 종부세 세율 (1세대 1주택자) ───
	singleHomeTaxBrackets: [
		{ min: 0, max: 300_000_000, rate: 0.005, progressiveDeduction: 0 },
		{ min: 300_000_000, max: 600_000_000, rate: 0.007, progressiveDeduction: 600_000 },
		{ min: 600_000_000, max: 1_200_000_000, rate: 0.01, progressiveDeduction: 2_400_000 },
		{ min: 1_200_000_000, max: 2_500_000_000, rate: 0.013, progressiveDeduction: 6_000_000 },
		{ min: 2_500_000_000, max: 5_000_000_000, rate: 0.015, progressiveDeduction: 11_000_000 },
		{ min: 5_000_000_000, max: Infinity, rate: 0.02, progressiveDeduction: 36_000_000 },
	] as TaxBracket[],

	// ─── 고령자 공제 (1세대 1주택자만) ───
	seniorDeduction: [
		{ minAge: 60, maxAge: 65, rate: 0.2 },
		{ minAge: 65, maxAge: 70, rate: 0.3 },
		{ minAge: 70, maxAge: Infinity, rate: 0.4 },
	] as AgeDeductionTier[],

	// ─── 장기보유 공제 (1세대 1주택자만) ───
	longTermHoldingDeduction: [
		{ minYears: 5, maxYears: 10, rate: 0.2 },
		{ minYears: 10, maxYears: 15, rate: 0.4 },
		{ minYears: 15, maxYears: Infinity, rate: 0.5 },
	] as HoldingDeductionTier[],

	/** 세액공제 합산 상한 (DR-RE-02-01: 80%) */
	maxCombinedDeductionRate: 0.8,

	/** 농어촌특별세 세율 (본세의 20%) */
	ruralSpecialTaxRate: 0.2,

	// ─── 재산세 세율 (주택, 중복분 차감용) ───
	propertyTaxBrackets: [
		{ min: 0, max: 60_000_000, rate: 0.001, progressiveDeduction: 0 },
		{ min: 60_000_000, max: 150_000_000, rate: 0.0015, progressiveDeduction: 30_000 },
		{ min: 150_000_000, max: 300_000_000, rate: 0.0025, progressiveDeduction: 180_000 },
		{ min: 300_000_000, max: Infinity, rate: 0.004, progressiveDeduction: 630_000 },
	] as TaxBracket[],

	/** 재산세 공정시장가액비율 */
	propertyTaxFairMarketRatio: 0.6,
};
