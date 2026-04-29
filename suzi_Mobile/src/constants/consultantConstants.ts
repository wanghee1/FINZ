/**
 * 세무사 상담 관련 상수
 */
import { TaxConsultant, ConsultantSpecialty } from "../types";

/** 세무사 전문 분야 라벨 */
export const CONSULTANT_SPECIALTY_LABELS: Record<ConsultantSpecialty, string> = {
	income_tax: "소득세",
	property_tax: "종합부동산세",
	capital_gains: "양도소득세",
	gift_inheritance: "증여·상속세",
	corporate_tax: "법인세",
	vat: "부가가치세",
	amendment: "경정청구",
};

/** 세무사 목업 데이터 */
export const MOCK_CONSULTANTS: TaxConsultant[] = [
	{
		id: "cta-001",
		name: "김세무",
		firm: "세무법인 한길",
		specialties: ["property_tax", "capital_gains", "gift_inheritance"],
		rating: 4.9,
		reviewCount: 328,
		experience: 15,
		introduction:
			"부동산 관련 세무 전문입니다. 종부세, 양도세, 증여·상속세 관련 풍부한 상담 경험을 보유하고 있습니다.",
		consultationFee: 50000,
		isOnline: true,
		responseTime: "보통 5분 이내",
	},
	{
		id: "cta-002",
		name: "이정환",
		firm: "정환세무회계사무소",
		specialties: ["income_tax", "amendment", "vat"],
		rating: 4.8,
		reviewCount: 215,
		experience: 12,
		introduction:
			"소득세 감면·경정청구 전문 세무사입니다. 청년 소득세 감면, 종합소득세 신고 관련 다수의 성공 사례를 보유하고 있습니다.",
		consultationFee: 40000,
		isOnline: true,
		responseTime: "보통 10분 이내",
	},
	{
		id: "cta-003",
		name: "박지현",
		firm: "세무법인 미래",
		specialties: ["property_tax", "gift_inheritance", "corporate_tax"],
		rating: 4.7,
		reviewCount: 189,
		experience: 10,
		introduction: "자산관리 및 증여·상속 설계 전문입니다. 고액 자산가 대상 절세 플랜 수립 경험이 풍부합니다.",
		consultationFee: 60000,
		isOnline: false,
		responseTime: "보통 30분 이내",
	},
	{
		id: "cta-004",
		name: "최민수",
		firm: "민수세무회계",
		specialties: ["income_tax", "capital_gains", "amendment"],
		rating: 4.6,
		reviewCount: 142,
		experience: 8,
		introduction: "직장인·프리랜서 세금 관련 상담을 전문으로 합니다. 쉽고 친절한 설명을 약속드립니다.",
		consultationFee: 30000,
		isOnline: true,
		responseTime: "보통 15분 이내",
	},
	{
		id: "cta-005",
		name: "정수진",
		firm: "세무법인 새길",
		specialties: ["property_tax", "capital_gains"],
		rating: 4.9,
		reviewCount: 276,
		experience: 18,
		introduction:
			"부동산 매매·보유 관련 세무 상담 18년 경력의 베테랑 세무사입니다. 종부세 시뮬레이션 결과를 바탕으로 최적의 방향을 안내해 드립니다.",
		consultationFee: 70000,
		isOnline: true,
		responseTime: "보통 10분 이내",
	},
];
