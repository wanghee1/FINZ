/**
 * 6Way 세금 비교 시뮬레이션 관련 상수
 */

/** 6Way 시나리오 라벨 */
export const SIX_WAY_SCENARIO_LABELS: Record<number, string> = {
	1: "A주택 양도",
	2: "A주택 증여",
	3: "A주택 부담부증여",
	4: "B주택 양도",
	5: "B주택 증여",
	6: "B주택 부담부증여",
};

/** 수증자 관계 옵션 */
export const DONEE_RELATION_OPTIONS = [
	{ value: "SPOUSE" as const, label: "배우자", deduction: "6억원" },
	{
		value: "LINEAL_DESCENDANT_ADULT" as const,
		label: "직계비속 (성인)",
		deduction: "5,000만원",
	},
	{
		value: "LINEAL_DESCENDANT_MINOR" as const,
		label: "직계비속 (미성년)",
		deduction: "2,000만원",
	},
];

/** 다주택 중과 유예 만료일 (2026.5.9) */
export const SURCHARGE_DEADLINE = new Date(2026, 4, 9);
