// ──────────────────────────────────────────
// 중소기업 취업자 소득세 감면 경정청구 — 계산 엔진 v2.3
// 조세특례제한법 제30조 · 시행령 제27조 · 소득세법 제55조·제59조
// ──────────────────────────────────────────
import {
	Gender,
	EmploymentType,
	IneligibleReason,
	EligibilityResult,
	ClaimableYear,
	YearlyRefundDetail,
	YouthTaxResult,
	YearlyIncomeData,
	TaxReductionConfig,
	ClaimType,
	FeeEstimate,
	RiskLevel,
	RiskAssessment,
} from "../types";
import { YOUTH_TAX_REDUCTION_CONFIG } from "../constants";

// ══════════════════════════════════════════
// 날짜 유틸
// ══════════════════════════════════════════

function parseDate(dateStr: string): Date {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// ══════════════════════════════════════════
// Section 2-1: 나이 계산
// ══════════════════════════════════════════

/** 만 나이 계산 (기준일 시점) */
export function calculateAge(birthDate: string, referenceDate: string): number {
	const birth = parseDate(birthDate);
	const ref = parseDate(referenceDate);
	let age = ref.getFullYear() - birth.getFullYear();
	const monthDiff = ref.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

/** 세법상 나이 = 만 나이 − 군복무기간 (남성만, 최대 6년) */
export function calcTaxAge(birthDate: string, hireDate: string, militaryMonths: number, gender: Gender): number {
	const realAge = calculateAge(birthDate, hireDate);
	if (gender === "M" && militaryMonths > 0) {
		const deduction = Math.min(militaryMonths, 72) / 12;
		return realAge - deduction;
	}
	return realAge;
}

// ══════════════════════════════════════════
// Section 2-2: 병적증명서 처리 로직
// ══════════════════════════════════════════

/** 병적증명서 필요 여부 판정 */
export function needsMilitaryDoc(birthDate: string, hireDate: string, gender: Gender): boolean {
	if (gender !== "M") return false;
	const age = calculateAge(birthDate, hireDate);
	if (age <= 34) return false;
	if (age > 40) return false;
	return true;
}

/** 병적증명서에서 복무기간 계산 */
export function calculateMilitaryMonths(enlistDate: string, dischargeDate: string): number {
	const enlist = parseDate(enlistDate);
	const discharge = parseDate(dischargeDate);
	const months = (discharge.getFullYear() - enlist.getFullYear()) * 12 + (discharge.getMonth() - enlist.getMonth());
	return Math.max(0, Math.min(months, 72));
}

export function calculateMilitaryDeductionYears(enlistDate: string, dischargeDate: string): number {
	const months = calculateMilitaryMonths(enlistDate, dischargeDate);
	return Math.min(months / 12, 6);
}

export function formatMilitaryPeriod(months: number): string {
	const years = Math.floor(months / 12);
	const remainMonths = months % 12;
	if (years > 0 && remainMonths > 0) return `${years}년 ${remainMonths}개월`;
	if (years > 0) return `${years}년`;
	return `${remainMonths}개월`;
}

// ══════════════════════════════════════════
// Section 7-1: 감면율·한도·기간 파라미터
// ══════════════════════════════════════════

export function getReductionConfig(firstEmploymentDate: string): TaxReductionConfig {
	const date = parseDate(firstEmploymentDate);
	for (const config of YOUTH_TAX_REDUCTION_CONFIG) {
		const start = parseDate(config.firstEmploymentStart);
		const end = parseDate(config.firstEmploymentEnd);
		if (date >= start && date <= end) return config;
	}
	return YOUTH_TAX_REDUCTION_CONFIG[YOUTH_TAX_REDUCTION_CONFIG.length - 1];
}

/**
 * 연간 한도: "해당 과세연도" 기준 법령 적용
 * (감면율·감면기간은 취업일 기준이지만, 연간 한도는 과세연도 기준)
 */
export function getAnnualLimit(taxYear: number): number {
	if (taxYear <= 2015) return Infinity;
	if (taxYear <= 2022) return 1_500_000;
	return 2_000_000;
}

/** 감면 파라미터 결정 (취업일 + 과세연도 조합) */
export function getReductionParams(employmentType: EmploymentType, firstEmpDate: string, taxYear: number) {
	const empYear = parseDate(firstEmpDate).getFullYear();
	let rate: number;
	if (employmentType !== "YOUTH") {
		rate = 0.7;
	} else if (empYear <= 2013) {
		rate = 1.0;
	} else if (empYear <= 2015) {
		rate = 0.5;
	} else if (empYear <= 2017) {
		rate = 0.7;
	} else {
		rate = 0.9;
	}

	const duration = employmentType === "YOUTH" && empYear >= 2016 ? 5 : 3;
	const annualLimit = getAnnualLimit(taxYear);
	const isEligible = taxYear >= empYear && taxYear < empYear + duration;

	return { rate, duration, annualLimit, isEligible };
}

// ══════════════════════════════════════════
// Section 7-2: 종합소득세율 구간 (3단계 분기)
// ══════════════════════════════════════════

export function calcTax(taxableIncome: number, taxYear: number): number {
	const b = taxableIncome;
	let tax: number;

	if (taxYear <= 2020) {
		if (b <= 12_000_000) tax = b * 0.06;
		else if (b <= 46_000_000) tax = 720_000 + (b - 12_000_000) * 0.15;
		else if (b <= 88_000_000) tax = 5_820_000 + (b - 46_000_000) * 0.24;
		else if (b <= 150_000_000) tax = 15_900_000 + (b - 88_000_000) * 0.35;
		else if (b <= 300_000_000) tax = 37_600_000 + (b - 150_000_000) * 0.38;
		else if (b <= 500_000_000) tax = 94_600_000 + (b - 300_000_000) * 0.4;
		else tax = 174_600_000 + (b - 500_000_000) * 0.42;
	} else if (taxYear <= 2022) {
		if (b <= 12_000_000) tax = b * 0.06;
		else if (b <= 46_000_000) tax = 720_000 + (b - 12_000_000) * 0.15;
		else if (b <= 88_000_000) tax = 5_820_000 + (b - 46_000_000) * 0.24;
		else if (b <= 150_000_000) tax = 15_900_000 + (b - 88_000_000) * 0.35;
		else if (b <= 300_000_000) tax = 37_600_000 + (b - 150_000_000) * 0.38;
		else if (b <= 500_000_000) tax = 94_600_000 + (b - 300_000_000) * 0.4;
		else if (b <= 1_000_000_000) tax = 174_600_000 + (b - 500_000_000) * 0.42;
		else tax = 384_600_000 + (b - 1_000_000_000) * 0.45;
	} else {
		if (b <= 14_000_000) tax = b * 0.06;
		else if (b <= 50_000_000) tax = 840_000 + (b - 14_000_000) * 0.15;
		else if (b <= 88_000_000) tax = 6_240_000 + (b - 50_000_000) * 0.24;
		else if (b <= 150_000_000) tax = 15_360_000 + (b - 88_000_000) * 0.35;
		else if (b <= 300_000_000) tax = 37_060_000 + (b - 150_000_000) * 0.38;
		else if (b <= 500_000_000) tax = 94_060_000 + (b - 300_000_000) * 0.4;
		else if (b <= 1_000_000_000) tax = 174_060_000 + (b - 500_000_000) * 0.42;
		else tax = 384_060_000 + (b - 1_000_000_000) * 0.45;
	}
	return Math.round(tax);
}

// ══════════════════════════════════════════
// 경정청구 기한 판정
// ══════════════════════════════════════════

export function getFilingDeadline(taxYear: number): Date {
	return new Date(taxYear + 1, 4, 31);
}

export function getClaimDeadline(taxYear: number): Date {
	return new Date(taxYear + 6, 4, 31);
}

export function getClaimDeadlineString(taxYear: number): string {
	const d = getClaimDeadline(taxYear);
	return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function isWithinClaimDeadline(taxYear: number, currentDate: Date): boolean {
	return currentDate > getFilingDeadline(taxYear) && currentDate <= getClaimDeadline(taxYear);
}

export function isCurrentTaxYear(taxYear: number, currentDate: Date): boolean {
	return currentDate <= getFilingDeadline(taxYear);
}

export function getClaimType(taxYear: number, currentDate: Date): ClaimType {
	return isCurrentTaxYear(taxYear, currentDate) ? "COMPANY" : "AMENDMENT";
}

// ══════════════════════════════════════════
// 감면 적용 가능 연도 산정
// ══════════════════════════════════════════

export function getReductionPeriodYears(firstEmploymentDate: string, employmentType: EmploymentType): number[] {
	const firstYear = parseDate(firstEmploymentDate).getFullYear();
	const empYear = firstYear;
	const duration = employmentType === "YOUTH" && empYear >= 2016 ? 5 : 3;
	const lastYear = firstYear + duration - 1;
	const years: number[] = [];
	for (let y = firstYear; y <= lastYear; y++) years.push(y);
	return years;
}

export function getClaimableYears(
	firstEmploymentDate: string,
	currentDate: Date,
	employmentType: EmploymentType = "YOUTH",
): ClaimableYear[] {
	const reductionYears = getReductionPeriodYears(firstEmploymentDate, employmentType);
	const result: ClaimableYear[] = [];
	for (const year of reductionYears) {
		if (isCurrentTaxYear(year, currentDate)) {
			result.push({ year, type: "COMPANY" });
		} else if (isWithinClaimDeadline(year, currentDate)) {
			result.push({ year, type: "AMENDMENT" });
		}
	}
	return result;
}

// ══════════════════════════════════════════
// Section 2-3: 자격 판정 엔진
// ══════════════════════════════════════════

export interface EligibilityInput {
	birthDate: string;
	firstEmploymentDate: string;
	gender: Gender;
	hasMilitary: boolean;
	enlistDate?: string;
	dischargeDate?: string;
	isSme: boolean;
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
	const reasons: IneligibleReason[] = [];
	const currentDate = new Date();

	const ageAtEmployment = calculateAge(input.birthDate, input.firstEmploymentDate);
	let militaryServiceMonths = 0;
	let militaryDeductionYears = 0;

	if (input.hasMilitary && input.enlistDate && input.dischargeDate) {
		militaryServiceMonths = calculateMilitaryMonths(input.enlistDate, input.dischargeDate);
		militaryDeductionYears = calculateMilitaryDeductionYears(input.enlistDate, input.dischargeDate);
	}

	const taxAge = calcTaxAge(input.birthDate, input.firstEmploymentDate, militaryServiceMonths, input.gender);
	const adjustedAge = Math.floor(taxAge);
	const needsMilDoc = needsMilitaryDoc(input.birthDate, input.firstEmploymentDate, input.gender);

	let employmentType: EmploymentType | null = null;
	if (taxAge >= 15 && taxAge <= 34) {
		employmentType = "YOUTH";
	} else if (ageAtEmployment >= 60) {
		employmentType = "SENIOR";
	}

	if (!employmentType) {
		if (ageAtEmployment > 34 && ageAtEmployment < 60) {
			reasons.push({
				code: "NOT_ELIGIBLE",
				detail: `취업 시점 만 ${ageAtEmployment}세${input.hasMilitary ? ` (세법상 ${taxAge.toFixed(1)}세)` : ""}로 청년(15~34세) 및 고령자(60세 이상) 요건을 모두 충족하지 않습니다.`,
			});
		} else if (ageAtEmployment < 15) {
			reasons.push({
				code: "AGE_UNDER",
				detail: `취업 시점 만 ${ageAtEmployment}세로 최소 연령(15세) 미달입니다.`,
			});
		}
	}

	if (!input.isSme) {
		reasons.push({
			code: "NON_SME",
			detail: "조세특례제한법상 중소기업 요건을 충족하지 않습니다.",
		});
	}

	const config = employmentType === "YOUTH" ? getReductionConfig(input.firstEmploymentDate) : null;
	const firstYear = parseDate(input.firstEmploymentDate).getFullYear();
	const duration = employmentType === "YOUTH" ? (config?.maxPeriodYears ?? 5) : 3;
	const reductionRate = employmentType === "YOUTH" ? (config?.reductionRate ?? 0.9) : 0.7;
	const reductionPeriodEnd = firstYear + duration - 1;

	const claimableYears = employmentType
		? getClaimableYears(input.firstEmploymentDate, currentDate, employmentType)
		: [];

	if (employmentType && claimableYears.length === 0) {
		reasons.push({
			code: "DEADLINE_EXPIRED",
			detail: "경정청구 가능한 과세연도가 없습니다. 감면 기간 경과 또는 경정청구 기한 만료.",
		});
	}

	return {
		isEligible: reasons.length === 0 && employmentType !== null,
		employmentType,
		ineligibleReasons: reasons,
		ageAtEmployment,
		taxAge,
		adjustedAge,
		hasMilitaryDeduction: input.hasMilitary && militaryServiceMonths > 0,
		militaryServiceMonths,
		militaryDeductionYears,
		needsMilitaryDoc: needsMilDoc,
		isSme: input.isSme,
		reductionPeriodStart: firstYear,
		reductionPeriodEnd,
		reductionRate,
		annualCap: getAnnualLimit(firstYear),
		claimableYears,
	};
}

// ══════════════════════════════════════════
// Section 3: Case A — 단일 근로소득 감면세액 계산
// ══════════════════════════════════════════

interface ReductionResult {
	reductionAmount: number;
	rawReduction: number;
	wageTaxCreditAfter: number;
	correctedFinalTax: number;
}

function computeReductionSimple(
	calculatedTax: number,
	wageTaxCreditBefore: number,
	reductionRate: number,
	annualLimit: number,
): ReductionResult {
	if (calculatedTax <= 0) {
		return { reductionAmount: 0, rawReduction: 0, wageTaxCreditAfter: wageTaxCreditBefore, correctedFinalTax: 0 };
	}

	const rawReduction = calculatedTax * reductionRate;
	const reductionAmount = Math.min(Math.floor(rawReduction), annualLimit);

	let wageTaxCreditAfter = 0;
	if (calculatedTax > 0) {
		wageTaxCreditAfter = Math.floor(wageTaxCreditBefore * (1 - reductionAmount / calculatedTax));
	}

	let correctedFinalTax = calculatedTax - reductionAmount - wageTaxCreditAfter;
	if (correctedFinalTax < 0) correctedFinalTax = 0;

	return { reductionAmount, rawReduction: Math.floor(rawReduction), wageTaxCreditAfter, correctedFinalTax };
}

// ══════════════════════════════════════════
// Section 4: Case B — 종합소득 비례배분 감면세액 계산
// ══════════════════════════════════════════

function computeReductionWithOtherIncome(
	calculatedTax: number,
	wageTaxCreditBefore: number,
	reductionRate: number,
	annualLimit: number,
	earnedIncomeAmount: number,
	otherIncomeAmount: number,
	salaryFromSme: number,
	totalSalary: number,
): ReductionResult {
	if (calculatedTax <= 0) {
		return { reductionAmount: 0, rawReduction: 0, wageTaxCreditAfter: wageTaxCreditBefore, correctedFinalTax: 0 };
	}

	const globalIncome = earnedIncomeAmount + otherIncomeAmount;
	if (globalIncome <= 0) {
		return computeReductionSimple(calculatedTax, wageTaxCreditBefore, reductionRate, annualLimit);
	}

	const ratioEarned = earnedIncomeAmount / globalIncome;
	const ratioSme = totalSalary > 0 ? salaryFromSme / totalSalary : 0;

	const rawReduction = calculatedTax * ratioEarned * ratioSme * reductionRate;
	const reductionAmount = Math.min(Math.floor(rawReduction), annualLimit);

	let wageTaxCreditAfter = 0;
	if (calculatedTax > 0) {
		wageTaxCreditAfter = Math.floor(wageTaxCreditBefore * (1 - reductionAmount / calculatedTax));
	}

	let correctedFinalTax = calculatedTax - reductionAmount - wageTaxCreditAfter;
	if (correctedFinalTax < 0) correctedFinalTax = 0;

	return { reductionAmount, rawReduction: Math.floor(rawReduction), wageTaxCreditAfter, correctedFinalTax };
}

/** Case A/B 자동 분기 */
function computeReductionAuto(data: YearlyIncomeData, reductionRate: number, annualLimit: number): ReductionResult {
	const hasProportion =
		data.otherIncomeAmount > 0 || (data.salaryFromSme < data.totalSalary && data.salaryFromSme > 0);

	if (hasProportion) {
		return computeReductionWithOtherIncome(
			data.calculatedTax,
			data.wageTaxCreditBeforeReduction,
			reductionRate,
			annualLimit,
			data.earnedIncomeAmount,
			data.otherIncomeAmount,
			data.salaryFromSme,
			data.totalSalary,
		);
	}
	return computeReductionSimple(data.calculatedTax, data.wageTaxCreditBeforeReduction, reductionRate, annualLimit);
}

// ══════════════════════════════════════════
// Section 5: 경정청구 환급액 산출
// ══════════════════════════════════════════

export function calculateYearRefund(
	yearData: YearlyIncomeData,
	employmentType: EmploymentType,
	firstEmploymentDate: string,
	currentDate: Date,
): YearlyRefundDetail {
	const yearReasons: IneligibleReason[] = [];

	const originalFinalTax = yearData.originallyReportedFinalTax;

	if (originalFinalTax <= 0 && yearData.calculatedTax <= 0) {
		yearReasons.push({
			code: "ZERO_DETERMINED_TAX",
			detail: `${yearData.year}년 산출세액·결정세액이 0원으로 환급이 발생하지 않습니다.`,
		});
	}

	if (yearData.reductionApplied) {
		yearReasons.push({
			code: "ALREADY_APPLIED",
			detail: `${yearData.year}년에 이미 감면이 적용되어 있습니다.`,
		});
	}

	if (!yearData.isSme) {
		yearReasons.push({
			code: "NON_SME",
			detail: `${yearData.year}년 사업장이 중소기업 요건을 충족하지 않습니다.`,
		});
	}

	const canCalculate = yearReasons.length === 0;
	const params = getReductionParams(employmentType, firstEmploymentDate, yearData.year);

	let result: ReductionResult = {
		reductionAmount: 0,
		rawReduction: 0,
		wageTaxCreditAfter: yearData.wageTaxCreditBeforeReduction,
		correctedFinalTax: originalFinalTax,
	};

	if (canCalculate) {
		result = computeReductionAuto(yearData, params.rate, params.annualLimit);
	}

	const diff = originalFinalTax - result.correctedFinalTax;
	const refundAmount = Math.max(0, diff);
	const refundLocalTax = Math.floor(refundAmount * 0.1);
	const totalRefund = refundAmount + refundLocalTax;

	const claimType = getClaimType(yearData.year, currentDate);
	const withinDeadline =
		isCurrentTaxYear(yearData.year, currentDate) || isWithinClaimDeadline(yearData.year, currentDate);

	return {
		year: yearData.year,
		totalSalary: yearData.totalSalary,
		calculatedTax: yearData.calculatedTax,
		originalFinalTax,
		reductionRate: params.rate * 100,
		annualCap: params.annualLimit,
		rawReduction: result.rawReduction,
		reductionAmount: result.reductionAmount,
		wageTaxCreditBefore: yearData.wageTaxCreditBeforeReduction,
		wageTaxCreditAfter: result.wageTaxCreditAfter,
		correctedFinalTax: result.correctedFinalTax,
		refundAmount,
		refundLocalTax,
		totalRefund,
		type: claimType,
		isWithinClaimDeadline: withinDeadline,
		reductionApplied: yearData.reductionApplied,
		ineligibleReasons: yearReasons,
		deadlineDate: getClaimDeadlineString(yearData.year),
		refundIncomeTax: refundAmount,
		determinedTax: originalFinalTax,
		paidTax: originalFinalTax,
		reductionBaseTax: result.rawReduction,
		cappedReductionTax: result.reductionAmount,
	};
}

// ══════════════════════════════════════════
// Section 8-2: 수수료 계산
// ══════════════════════════════════════════

export function calcTaxAgentFee(refundAmount: number): number {
	if (refundAmount <= 0) return 0;
	let rate: number, maxFee: number;
	if (refundAmount <= 1_000_000) {
		rate = 0.2;
		maxFee = 200_000;
	} else if (refundAmount <= 5_000_000) {
		rate = 0.15;
		maxFee = 750_000;
	} else {
		rate = 0.1;
		maxFee = 1_500_000;
	}
	const rawFee = Math.round(refundAmount * rate);
	return Math.max(100_000, Math.min(rawFee, maxFee));
}

export function calculateFeeEstimate(totalRefund: number): FeeEstimate {
	const fee = calcTaxAgentFee(totalRefund);
	return {
		refundAmount: totalRefund,
		taxAgentFee: fee,
		customerNet: totalRefund - fee,
		feeRate: totalRefund > 0 ? fee / totalRefund : 0,
	};
}

// ══════════════════════════════════════════
// Section 8-6: 리스크 판별 엔진
// ══════════════════════════════════════════

export function assessRisk(eligibilityResult: EligibilityResult, yearDataList: YearlyIncomeData[]): RiskAssessment {
	const risks: { level: RiskLevel; reason: string }[] = [];

	if (eligibilityResult.taxAge >= 33.0 && eligibilityResult.taxAge <= 34.0) {
		risks.push({ level: "HIGH", reason: "세법상 나이 경계값 근접 (34세)" });
	}

	for (const yd of yearDataList) {
		if (yd.otherIncomeAmount > 0 || yd.salaryFromSme < yd.totalSalary) {
			risks.push({ level: "MEDIUM", reason: `${yd.year}년 비례배분 케이스 — 세무사 검토 필요` });
			break;
		}
	}

	const maxRisk = risks.reduce<RiskLevel>(
		(max, r) => (r.level === "HIGH" ? "HIGH" : max === "HIGH" ? "HIGH" : r.level),
		"LOW",
	);

	return {
		maxRisk,
		autoSubmitAllowed: maxRisk !== "HIGH",
		needsReview: maxRisk !== "LOW",
		risks,
	};
}

// ══════════════════════════════════════════
// Section 6: 전체 시뮬레이션 (다년 일괄)
// ══════════════════════════════════════════

export function runSimulation(eligibilityInput: EligibilityInput, incomeData: YearlyIncomeData[]): YouthTaxResult {
	const currentDate = new Date();
	const eligibility = checkEligibility(eligibilityInput);
	const employmentType = eligibility.employmentType ?? "YOUTH";

	const claimableYearNums = eligibility.claimableYears.map((y) => y.year);

	const yearlyDetails: YearlyRefundDetail[] = incomeData
		.filter((d) => claimableYearNums.includes(d.year))
		.map((d) => calculateYearRefund(d, employmentType, eligibilityInput.firstEmploymentDate, currentDate))
		.sort((a, b) => a.year - b.year);

	const totalRefundIncomeTax = yearlyDetails.reduce((s, d) => s + d.refundAmount, 0);
	const totalRefundLocalTax = yearlyDetails.reduce((s, d) => s + d.refundLocalTax, 0);
	const totalRefundEstimate = totalRefundIncomeTax + totalRefundLocalTax;

	const feeEstimate = calculateFeeEstimate(totalRefundEstimate);
	const riskAssessment = assessRisk(eligibility, incomeData);

	const claimableAmendmentYears = yearlyDetails
		.filter((d) => d.type === "AMENDMENT" && d.totalRefund > 0)
		.map((d) => d.year);
	const currentYears = yearlyDetails.filter((d) => d.type === "COMPANY").map((d) => d.year);

	return {
		eligibility,
		yearlyDetails,
		totalRefundIncomeTax,
		totalRefundLocalTax,
		totalRefundEstimate,
		feeEstimate,
		riskAssessment,
		claimableAmendmentYears,
		currentYears,
		ruleVersion: "조세특례제한법 제30조 (2025.12 기준)",
		calculatedAt: formatDate(currentDate),
	};
}

// ══════════════════════════════════════════
// 근로소득세액공제 추정 (입력 없을 때 fallback)
// ══════════════════════════════════════════

function estimateWageTaxCredit(calculatedTax: number, totalSalary: number): number {
	let credit: number;
	if (calculatedTax <= 1_300_000) {
		credit = Math.floor(calculatedTax * 0.55);
	} else {
		credit = 715_000 + Math.floor((calculatedTax - 1_300_000) * 0.3);
	}

	let limit: number;
	if (totalSalary <= 33_000_000) {
		limit = 740_000;
	} else if (totalSalary <= 70_000_000) {
		limit = Math.max(660_000, 740_000 - Math.floor((totalSalary - 33_000_000) * 0.008));
	} else {
		limit = Math.max(500_000, 660_000 - Math.floor((totalSalary - 70_000_000) * 0.5));
	}

	return Math.min(credit, limit);
}

// ══════════════════════════════════════════
// 목업 소득 데이터 생성 (v2.3)
// ══════════════════════════════════════════

export function generateMockIncomeData(years: number[]): YearlyIncomeData[] {
	const baseSalaries: Record<number, number> = {
		2020: 26_000_000,
		2021: 28_000_000,
		2022: 30_000_000,
		2023: 32_000_000,
		2024: 35_000_000,
		2025: 37_000_000,
	};

	return years.map((year) => {
		const salary = baseSalaries[year] || 30_000_000;
		const calculatedTax = calcTax(Math.floor(salary * 0.6), year);
		const wageCredit = estimateWageTaxCredit(calculatedTax, salary);
		const originalFinalTax = Math.max(0, calculatedTax - wageCredit);

		return {
			year,
			totalSalary: salary,
			salaryFromSme: salary,
			earnedIncomeAmount: Math.floor(salary * 0.75),
			otherIncomeAmount: 0,
			calculatedTax,
			wageTaxCreditBeforeReduction: wageCredit,
			originallyReportedReductionAmount: 0,
			originallyReportedFinalTax: originalFinalTax,
			reductionApplied: false,
			isSme: true,
		};
	});
}
