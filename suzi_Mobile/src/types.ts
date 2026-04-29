// ──────────────────────────────────────────
// FINZ MVP v3.0 — 타입 정의
// ──────────────────────────────────────────

/** 생애주기 단계 */
export type LifecycleStage = "FORMATION" | "OPERATION" | "TRANSFER";

export interface UserProfile {
	name: string;
	email: string;
	birthDate: string; // "YYYY-MM-DD"
	age: number;
	lifecycleStage: LifecycleStage;
}

/** 생애주기 서비스 카테고리 */
export interface LifecycleService {
	id: string;
	title: string;
	description: string;
	icon: string;
	stage: LifecycleStage;
	isAvailable: boolean;
}

/** 세무서비스 카드 */
export interface TaxServiceCard {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	type: "season" | "always" | "upcoming";
	dDay?: number;
	route?: string;
}

// ──────────────────────────────────────────
// Track 1: 중소기업 취업자 소득세 감면 경정청구 (v2.3)
// ──────────────────────────────────────────

/** 간편인증 플로우 상태 */
export type AuthStatus = "idle" | "requesting" | "waiting" | "confirmed" | "failed" | "expired";

/** 간편인증 수단 */
export type AuthProviderId = "kakao" | "pass" | "toss" | "naver" | "samsung" | "kb" | "shinhan" | "banksalad" | "nh" | "woori";

/** 데이터 조회 상태 */
export type DataFetchStatus = "idle" | "loading" | "success" | "error" | "no_data";

/** 성별 */
export type Gender = "M" | "F";

/** 감면 대상 유형: 청년 / 고령자 */
export type EmploymentType = "YOUTH" | "SENIOR";

/** 비대상 사유 코드 */
export type IneligibleReasonCode =
	| "AGE_OVER"
	| "AGE_UNDER"
	| "NON_SME"
	| "EXCLUDED_INDUSTRY"
	| "PERIOD_EXPIRED"
	| "DEADLINE_EXPIRED"
	| "ZERO_DETERMINED_TAX"
	| "MULTIPLE_NON_SME_EMPLOYER"
	| "ALREADY_APPLIED"
	| "NOT_ELIGIBLE";

/** 비대상 사유 */
export interface IneligibleReason {
	code: IneligibleReasonCode;
	detail: string;
}

/** 복무 유형 */
export type MilitaryServiceType = "active" | "supplementary" | "officer" | "nco" | "other";

/** 경정청구 유형 */
export type ClaimType = "COMPANY" | "AMENDMENT";

/** 감면율·기간 설정 테이블 항목 (취업일 기준) */
export interface TaxReductionConfig {
	id: string;
	label: string;
	firstEmploymentStart: string;
	firstEmploymentEnd: string;
	reductionRate: number;
	annualCap: number;
	maxPeriodYears: number;
}

/** Track 1 — 사용자 입력 데이터 */
export interface YouthTaxInput {
	birthDate: string;
	firstEmploymentDate: string;
	gender: Gender;
	hasMilitaryService: boolean;
	militaryServiceType?: MilitaryServiceType;
	enlistmentDate?: string;
	dischargeDate?: string;
	businessRegistrationNo: string;
	incomeData: YearlyIncomeData[];
}

/** 연도별 소득 데이터 (v2.3 InputYearData) */
export interface YearlyIncomeData {
	year: number;
	totalSalary: number;
	salaryFromSme: number;
	earnedIncomeAmount: number;
	otherIncomeAmount: number;
	calculatedTax: number;
	wageTaxCreditBeforeReduction: number;
	originallyReportedReductionAmount: number;
	originallyReportedFinalTax: number;
	reductionApplied: boolean;
	isSme: boolean;
	/** @deprecated determinedTax -> originallyReportedFinalTax */
	determinedTax?: number;
	/** @deprecated paidTax -> originallyReportedFinalTax */
	paidTax?: number;
	existingReductionAmount?: number;
	businessRegistrationNo?: string;
}

/** 리스크 레벨 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** 리스크 판별 결과 */
export interface RiskAssessment {
	maxRisk: RiskLevel;
	autoSubmitAllowed: boolean;
	needsReview: boolean;
	risks: { level: RiskLevel; reason: string }[];
}

/** Track 1 — 대상 판별 결과 */
export interface EligibilityResult {
	isEligible: boolean;
	employmentType: EmploymentType | null;
	ineligibleReasons: IneligibleReason[];
	ageAtEmployment: number;
	taxAge: number;
	adjustedAge: number;
	hasMilitaryDeduction: boolean;
	militaryServiceMonths: number;
	militaryDeductionYears: number;
	needsMilitaryDoc: boolean;
	isSme: boolean;
	reductionPeriodStart: number;
	reductionPeriodEnd: number;
	reductionRate: number;
	annualCap: number;
	claimableYears: ClaimableYear[];
}

export interface ClaimableYear {
	year: number;
	type: ClaimType;
}

/** Track 1 — 연도별 환급 계산 결과 (v2.3) */
export interface YearlyRefundDetail {
	year: number;
	totalSalary: number;
	calculatedTax: number;
	originalFinalTax: number;
	reductionRate: number;
	annualCap: number;
	rawReduction: number;
	reductionAmount: number;
	wageTaxCreditBefore: number;
	wageTaxCreditAfter: number;
	correctedFinalTax: number;
	refundAmount: number;
	refundLocalTax: number;
	totalRefund: number;
	type: ClaimType;
	isWithinClaimDeadline: boolean;
	reductionApplied: boolean;
	ineligibleReasons: IneligibleReason[];
	deadlineDate?: string;

	/** @deprecated */
	determinedTax?: number;
	paidTax?: number;
	reductionBaseTax?: number;
	cappedReductionTax?: number;
	refundIncomeTax?: number;
}

/** 수수료 추정 결과 */
export interface FeeEstimate {
	refundAmount: number;
	taxAgentFee: number;
	customerNet: number;
	feeRate: number;
}

/** Track 1 — 전체 시뮬레이션 결과 (v2.3) */
export interface YouthTaxResult {
	eligibility: EligibilityResult;
	yearlyDetails: YearlyRefundDetail[];
	totalRefundIncomeTax: number;
	totalRefundLocalTax: number;
	totalRefundEstimate: number;
	feeEstimate: FeeEstimate;
	riskAssessment: RiskAssessment;
	claimableAmendmentYears: number[];
	currentYears: number[];
	ruleVersion: string;
	calculatedAt: string;
}

// ──────────────────────────────────────────
// Track 2: 종합부동산세 시뮬레이션
// ──────────────────────────────────────────

/** Track 2: 보유 현황 입력 */
export interface PropertyInput {
	properties: PropertyItem[];
	scenarioBInput?: ScenarioBInput;
}

export interface PropertyItem {
	id: string;
	officialPrice: number;
	isJointOwnership: boolean;
	ownershipRatio: number;
	holdingYears: number;
	isExcluded: boolean;
}

export interface ScenarioBInput {
	type: "direct" | "template";
	directPrice?: number;
	templateId?: string;
}

/** Track 2: 시나리오 비교 결과 */
export interface PropertyScenarioResult {
	scenarioA: ScenarioDetail;
	scenarioB: ScenarioDetail;
	scenarioC: ScenarioDetail;
}

export interface ScenarioDetail {
	label: string;
	totalOfficialPrice: number;
	basicDeduction: number;
	taxBase: number;
	comprehensiveTax: number;
	ruralSpecialTax: number;
	totalAnnualTax: number;
	changeAmount?: number;
	changeRate?: number;
}

/** 저장된 시뮬레이션 */
export interface SavedSimulation {
	id: string;
	type: "youth_tax" | "property";
	title: string;
	createdAt: string;
	summary: string;
}

/** 알림 설정 */
export interface NotificationSettings {
	seasonService: boolean;
	lifecycleUpdate: boolean;
	pushEnabled: boolean;
}

// ──────────────────────────────────────────
// 세무사 상담
// ──────────────────────────────────────────

/** 세무사 전문 분야 */
export type ConsultantSpecialty =
	| "income_tax" // 소득세
	| "property_tax" // 종합부동산세
	| "capital_gains" // 양도소득세
	| "gift_inheritance" // 증여·상속세
	| "corporate_tax" // 법인세
	| "vat" // 부가가치세
	| "amendment"; // 경정청구

/** 세무사 프로필 */
export interface TaxConsultant {
	id: string;
	name: string;
	firm: string;
	profileImage?: string;
	specialties: ConsultantSpecialty[];
	rating: number;
	reviewCount: number;
	experience: number; // 경력(년)
	introduction: string;
	consultationFee: number; // 원
	isOnline: boolean;
	responseTime: string; // 예: "보통 10분 이내"
}

/** 채팅 메시지 발신자 */
export type ChatSender = "user" | "consultant" | "system";

/** 채팅 메시지 */
export interface ChatMessage {
	id: string;
	sender: ChatSender;
	text: string;
	timestamp: string;
	attachment?: ChatAttachment;
}

/** 첨부 파일 */
export interface ChatAttachment {
	id: string;
	name: string;
	type: "pdf" | "image" | "document";
	size: string; // 예: "2.3 MB"
	uri?: string;
}

// ──────────────────────────────────────────
// Navigation Types
// ──────────────────────────────────────────

export type RootStackParamList = {
	Landing: undefined;
	Auth: undefined;
	Onboarding: undefined;
	Company: undefined;
	B2B: undefined;
	MainTab: undefined;
	Track1YouthTax: undefined;
	Track2Property: undefined;
	LifecycleDetail: { stage: LifecycleStage; title: string };
	SeasonPopup: undefined;
	TaxConsultantList: { from?: string };
	TaxConsultantChat: { consultant: TaxConsultant; from?: string };
};

export type MainTabParamList = {
	Home: undefined;
	TaxService: undefined;
	Lifecycle: undefined;
	MyPage: undefined;
};
