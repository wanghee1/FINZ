import { apiClient } from "./apiClient";

// ── 간편인증 수단 목록 ──
export const AUTH_PROVIDERS = [
	{ id: "kakao", name: "카카오톡", icon: "chatbubble-ellipses-outline" as const },
	{ id: "pass", name: "PASS (통신사)", icon: "phone-portrait-outline" as const, requiresTelecom: true },
	{ id: "toss", name: "토스", icon: "wallet-outline" as const },
	{ id: "naver", name: "네이버", icon: "globe-outline" as const },
	{ id: "samsung", name: "삼성패스", icon: "finger-print-outline" as const },
	{ id: "kb", name: "KB모바일", icon: "business-outline" as const },
] as const;

export type AuthProviderId = (typeof AUTH_PROVIDERS)[number]["id"];

export const TELECOM_OPTIONS = [
	{ value: "0", label: "SKT" },
	{ value: "1", label: "KT" },
	{ value: "2", label: "LG U+" },
] as const;

// ── 응답 타입 ──
export interface SimpleAuthStartResponse {
	auth_request_id: string;
	auth_provider: string;
	status: string; // "WAITING_2WAY" | "VERIFIED" | "FAILED"
	timeout_sec: number;
	polling_hint_sec: number;
	message: string;
}

export interface SimpleAuthConfirmResponse {
	auth_request_id: string;
	status: string; // "WAITING_2WAY" | "VERIFIED" | "FAILED" | "EXPIRED"
	verified_at: string | null;
	message: string;
}

export interface YearResultInline {
	year: number;
	total_salary: number;
	calculated_tax: number;
	wage_tax_credit_before_red: number;
	originally_reported_final_tax: number;
	reduction_applied: boolean;
	has_income_data: boolean;
	annual_limit: number;
	raw_reduction: number;
	reduction_amount: number;
	wage_credit_after: number;
	corrected_final_tax: number;
	refund_income_tax: number;
	refund_local_tax: number;
	refund_total: number;
	calc_case: string;
}

export interface CalculationResultInline {
	employment_type: string;
	reduction_rate: number;
	total_estimated_refund: number;
	total_local_tax_refund: number;
	year_results: YearResultInline[];
}

export interface TaxDataCollectResponse {
	status: string;
	message: string;
	data_years_found: number;
	no_income_years: number[];
	calculation_result: CalculationResultInline | null;
}

export interface SaveResultResponse {
	calculation_id: string;
	status: string;
	message: string;
}

const track1Service = {
	// ── 간편인증 시작 (2WAY) ──
	async startAuth(data: {
		auth_provider: string;
		user_name: string;
		user_birth: string;
		user_mobile: string;
		telecom?: string;
	}) {
		return apiClient.post<SimpleAuthStartResponse>("/api/task1/auth/start", data);
	},

	// ── 간편인증 확인 (폴링) ──
	async confirmAuth(authRequestId: string) {
		return apiClient.post<SimpleAuthConfirmResponse>("/api/task1/auth/confirm", {
			auth_request_id: authRequestId,
		});
	},

	// ── 세금 데이터 수집 + 계산 ──
	async requestTaxData(data: {
		auth_request_id: string;
		years?: number[];
		employment_date?: string;
		gender?: string;
		has_military?: boolean;
		enlist_date?: string;
		discharge_date?: string;
	}) {
		return apiClient.post<TaxDataCollectResponse>("/api/task1/tax-data", data, true, 300_000);
	},

	// ── 최신 계산 결과 ──
	async getLatestResult() {
		return apiClient.get("/api/task1/refund/result");
	},

	// ── 계산 이력 ──
	async getHistory(page = 1, pageSize = 10) {
		return apiClient.getPaginated(`/api/task1/refund/history?page=${page}&page_size=${pageSize}`);
	},

	// ── 시뮬레이션 결과 저장 (사용자 "저장" 클릭 시) ──
	async saveResult(data: {
		auth_request_id?: string;
		employment_type: string;
		reduction_rate: number;
		total_estimated_refund: number;
		total_local_tax_refund?: number;
		year_results: Array<{
			year: number;
			annual_limit: number;
			raw_reduction: number;
			reduction_amount: number;
			wage_credit_after: number;
			corrected_final_tax: number;
			refund_income_tax: number;
			refund_local_tax: number;
			refund_total: number;
			calc_case: string;
		}>;
	}) {
		return apiClient.post<SaveResultResponse>("/api/task1/refund/save", data);
	},

	// ── 세무법인 인계 ──
	async createHandoff(data: {
		calculation_id: string;
		contact_name: string;
		contact_phone: string;
		contact_email?: string;
		consent_privacy: boolean;
		consent_partner: boolean;
		memo?: string;
	}) {
		return apiClient.post("/api/task1/handoffs", data);
	},

	// ── 인계 상태 조회 ──
	async getHandoff(handoffId: string) {
		return apiClient.get(`/api/task1/handoffs/${handoffId}`);
	},
};

export default track1Service;
