/**
 * 생애주기 서비스 관련 상수
 */
import { LifecycleService } from "../types";

/** 생애주기 서비스 목록 */
export const LIFECYCLE_SERVICES: LifecycleService[] = [
	{
		id: "blockchain_allowance",
		title: "블록체인 용돈 계약",
		description: "스마트컨트랙트 기반의 안전하고 투명한 용돈 관리 서비스",
		icon: "link-outline",
		stage: "FORMATION",
		isAvailable: false,
	},
	{
		id: "gift_plan",
		title: "증여 플랜 설계",
		description: "세법 기반 최적의 증여 타이밍과 구조를 설계하는 시뮬레이션",
		icon: "gift-outline",
		stage: "FORMATION",
		isAvailable: false,
	},
	{
		id: "digital_asset",
		title: "디지털 자산 정보 제공",
		description: "자산 현황과 시장 정보를 한눈에 확인",
		icon: "pie-chart-outline",
		stage: "OPERATION",
		isAvailable: false,
	},
	{
		id: "product_compare",
		title: "금융 상품 비교",
		description: "다양한 금융 상품을 한눈에 비교",
		icon: "git-compare-outline",
		stage: "OPERATION",
		isAvailable: false,
	},
	{
		id: "policy_news",
		title: "정책 뉴스",
		description: "금융·세무 정책 변화를 확인",
		icon: "newspaper-outline",
		stage: "OPERATION",
		isAvailable: false,
	},
	{
		id: "inheritance_sim",
		title: "증여·상속 시뮬레이션",
		description: "증여·상속 세금을 미리 계산하고 비교",
		icon: "people-outline",
		stage: "TRANSFER",
		isAvailable: false,
	},
];

/** 생애주기 단계 정의 */
export const LIFECYCLE_STAGES = [
	{
		key: "FORMATION" as const,
		label: "형성기",
		ageRange: "0~25세",
		icon: "leaf-outline",
		color: "#22C55E",
		bgColor: "#F0FDF4",
		description: "금융 습관의 기초를 형성하는 시기",
		services: ["blockchain_allowance", "gift_plan"],
	},
	{
		key: "OPERATION" as const,
		label: "운용기",
		ageRange: "25~50세",
		icon: "trending-up-outline",
		color: "#3B82F6",
		bgColor: "#EFF6FF",
		description: "자산을 적극적으로 운용하고 성장시키는 시기",
		services: ["digital_asset", "product_compare", "policy_news"],
	},
	{
		key: "TRANSFER" as const,
		label: "이전기",
		ageRange: "50세 이상",
		icon: "heart-outline",
		color: "#A855F7",
		bgColor: "#FAF5FF",
		description: "자산을 이전하고 안정적으로 관리하는 시기",
		services: ["inheritance_sim"],
	},
];
