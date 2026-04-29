/**
 * Track2 6Way 세금 비교 시뮬레이션 공용 타입
 *
 * 2주택자의 6가지 처분 시나리오(양도/증여/부담부증여 × A/B)에 대한
 * 비중과·중과 세금 비교 결과를 표현하는 타입 정의
 */

export type Step = "intro" | "input" | "result";

/** 6Way 시나리오 결과 (백엔드 ScenarioResult 대응) */
export interface ScenarioResult {
	scenario_no: number; // 1~6
	label: string; // "A주택 양도" 등
	target: "A" | "B";
	method: "SALE" | "GIFT" | "ONEROUS_GIFT";
	pre_capital_gains_tax: number;
	pre_gift_tax: number;
	pre_acquisition_tax: number;
	pre_total: number;
	post_capital_gains_tax: number;
	post_gift_tax: number;
	post_acquisition_tax: number;
	post_total: number;
	diff_from_base: number;
	surcharge_increase: number;
}

/** 6Way 전체 결과 */
export interface SixWayResult {
	simulation_id: string;
	scenarios: ScenarioResult[];
	rank_pre: number[]; // 비중과 기준 순위 (scenario_no 순)
	rank_post: number[]; // 중과 기준 순위
	optimal_pre: number; // 비중과 최적 scenario_no
	optimal_post: number; // 중과 최적 scenario_no
	risk_delta: number; // max(중과) - min(비중과)
	calculated_at: string;
}

/** 주택 정보 입력 폼 상태 */
export interface PropertyInput {
	address: string;
	market_price: string; // 억원 단위 문자열
	acquisition_price: string; // 억원 단위 문자열
	acquired_at: string; // YYYY-MM-DD
	is_regulated: boolean;
	lease_deposit: string; // 억원 단위
	loan_balance: string; // 억원 단위
}

/** 수증자 관계 */
export type DoneeRelation = "SPOUSE" | "LINEAL_DESCENDANT_ADULT" | "LINEAL_DESCENDANT_MINOR";
