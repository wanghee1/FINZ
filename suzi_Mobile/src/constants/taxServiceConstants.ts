/**
 * 세무서비스 카드 및 홈 배너 상수
 */
import { TaxServiceCard } from "../types";

/** 세무서비스 카드 목록 */
export const TAX_SERVICE_CARDS: TaxServiceCard[] = [
	{
		id: "track1",
		title: "청년 소득세 환급\n시뮬레이션",
		subtitle: "만 15~34세 중소기업 근로자 대상",
		icon: "receipt-outline",
		type: "season",
		dDay: 45,
		route: "Track1YouthTax",
	},
	{
		id: "track2",
		title: "부동산 시뮬레이션",
		subtitle: "양도·증여·부담부증여 6가지 시나리오 비교",
		icon: "analytics-outline",
		type: "always",
		route: "Track2Property",
	},
	{
		id: "capital_gains",
		title: "양도소득세\n시뮬레이션",
		subtitle: "",
		icon: "swap-horizontal-outline",
		type: "upcoming",
	},
	{
		id: "income_tax",
		title: "종합소득세\n시뮬레이션",
		subtitle: "",
		icon: "calculator-outline",
		type: "upcoming",
	},
];

/** 홈 배너 슬라이더 데이터 */
export const HOME_BANNERS = [
	{
		id: "season_youth",
		type: "season" as const,
		title: "청년 소득세 감면,\n환급받을 수 있는지 확인해보세요",
		subtitle: "종합소득세 신고 기간 한정 서비스",
		dDay: 45,
		color: "#0D9488",
		bgColor: "#F0FDFA",
		route: "Track1YouthTax",
	},
	{
		id: "always_property",
		type: "always" as const,
		title: "2주택, 어떻게 처분하면\n세금을 가장 줄일 수 있을까요?",
		subtitle: "양도·증여·부담부증여 비교 시뮬레이션",
		color: "#3B82F6",
		bgColor: "#EFF6FF",
		route: "Track2Property",
	},
];
