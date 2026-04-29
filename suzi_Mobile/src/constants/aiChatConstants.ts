/**
 * AI 챗봇 화면별 맥락형 추천 질문 및 설정
 *
 * PDF "AI 챗봇 도입 시나리오" 문서 기반
 * Track1 (6개 시나리오) + Track2 (6개 시나리오) + 공통
 */

/** 화면 컨텍스트 키 */
export type ScreenContextKey =
	// Track1
	| "track1_intro"
	| "track1_basic_info"
	| "track1_military"
	| "track1_income"
	| "track1_collecting"
	| "track1_result"
	// Track2
	| "track2_intro"
	| "track2_input"
	| "track2_scenario"
	| "track2_result"
	// 공통
	| "home"
	| "tax_service"
	| "lifecycle"
	| "consultant_list"
	| "consultant_chat"
	| "mypage"
	| "default";

/** 추천 질문 */
export interface SuggestedQuestion {
	id: string;
	text: string;
	category: "explain" | "help" | "interpret" | "prepare";
}

/** 화면별 AI 컨텍스트 정보 */
export interface ScreenAIContext {
	greeting: string;
	description: string;
	suggestedQuestions: SuggestedQuestion[];
}

/** AI 챗봇 기본 설정 */
export const AI_CHAT_CONFIG = {
	botName: "수지 AI",
	botAvatar: "sparkles",
	maxMessages: 100,
	typingDelay: { min: 800, max: 2000 },
	disclaimer: "AI의 답변은 참고용이며, 정확한 세무 판단은 세무사와 상담하세요.",
} as const;

/** 화면별 맥락 정보 */
export const SCREEN_AI_CONTEXTS: Record<ScreenContextKey, ScreenAIContext> = {
	// ─── Track1: 청년 소득세 감면 경정청구 ───

	track1_intro: {
		greeting: "청년 소득세 환급 시뮬레이션에 관심이 있으시군요!",
		description: "이 기능의 목적과 진행 과정을 안내해 드릴게요.",
		suggestedQuestions: [
			{ id: "t1i-1", text: "이 기능은 무엇을 하는 건가요?", category: "explain" },
			{ id: "t1i-2", text: "어떤 정보를 입력해야 하나요?", category: "help" },
			{ id: "t1i-3", text: "청년 소득세 감면이 뭔가요?", category: "explain" },
			{ id: "t1i-4", text: "경정청구가 무슨 뜻인가요?", category: "explain" },
		],
	},

	track1_basic_info: {
		greeting: "기본 정보 입력을 도와드릴게요.",
		description: "각 입력 항목의 의미와 확인 방법을 안내합니다.",
		suggestedQuestions: [
			{ id: "t1b-1", text: "최초 중소기업 취업일이 뭐예요?", category: "explain" },
			{ id: "t1b-2", text: "사업자등록번호는 어디서 확인하나요?", category: "help" },
			{ id: "t1b-3", text: "우리 회사가 중소기업인지 모르겠어요", category: "help" },
			{ id: "t1b-4", text: "이직한 경우에는 어떻게 입력하나요?", category: "help" },
		],
	},

	track1_military: {
		greeting: "병역 정보 입력 단계입니다.",
		description: "병역 정보가 감면 적용기간에 어떻게 영향을 주는지 설명해 드릴게요.",
		suggestedQuestions: [
			{ id: "t1m-1", text: "왜 병역 정보를 입력해야 하나요?", category: "explain" },
			{ id: "t1m-2", text: "병역 이행을 했는데 어떤 걸 입력해야 하나요?", category: "help" },
			{ id: "t1m-3", text: "보충역도 해당되나요?", category: "explain" },
			{ id: "t1m-4", text: "여성인 경우 어떻게 하나요?", category: "help" },
		],
	},

	track1_income: {
		greeting: "소득자료 입력 단계입니다.",
		description: "자동조회와 수동입력의 차이, 각 항목의 의미를 안내합니다.",
		suggestedQuestions: [
			{ id: "t1d-1", text: "자동조회와 수동입력은 뭐가 다른가요?", category: "explain" },
			{ id: "t1d-2", text: "결정세액이 뭐예요?", category: "explain" },
			{ id: "t1d-3", text: "감면 적용 여부는 어떻게 확인하나요?", category: "help" },
			{ id: "t1d-4", text: "산출세액은 어디서 확인할 수 있나요?", category: "help" },
		],
	},

	track1_collecting: {
		greeting: "소득자료를 조회하고 있습니다.",
		description: "조회 과정에서 궁금한 점이 있으시면 물어보세요.",
		suggestedQuestions: [
			{ id: "t1c-1", text: "자동 조회가 실패했어요. 어떻게 하나요?", category: "help" },
			{ id: "t1c-2", text: "조회된 데이터는 어디에 저장되나요?", category: "explain" },
			{ id: "t1c-3", text: "간편인증은 안전한가요?", category: "explain" },
		],
	},

	track1_result: {
		greeting: "시뮬레이션 결과가 나왔습니다!",
		description: "결과를 쉽게 이해할 수 있도록 도와드릴게요.",
		suggestedQuestions: [
			{ id: "t1r-1", text: "이 결과가 무슨 뜻인가요?", category: "interpret" },
			{ id: "t1r-2", text: "환급 가능성이 있는 건가요?", category: "interpret" },
			{ id: "t1r-3", text: "어떤 항목 때문에 이런 결과가 나왔나요?", category: "interpret" },
			{ id: "t1r-4", text: "세무사에게 무엇을 물어봐야 하나요?", category: "prepare" },
		],
	},

	// ─── Track2: 부동산 보유세 비교 시뮬레이션 ───

	track2_intro: {
		greeting: "부동산 세금 비교 시뮬레이션입니다!",
		description: "이 시뮬레이션이 무엇을 비교하는지 설명해 드릴게요.",
		suggestedQuestions: [
			{ id: "t2i-1", text: "이 기능은 뭘 보는 건가요?", category: "explain" },
			{ id: "t2i-2", text: "보유세 비교가 왜 필요한가요?", category: "explain" },
			{ id: "t2i-3", text: "6가지 시나리오가 뭔가요?", category: "explain" },
			{ id: "t2i-4", text: "중과 유예가 무슨 뜻인가요?", category: "explain" },
		],
	},

	track2_input: {
		greeting: "주택 정보 입력을 도와드릴게요.",
		description: "각 입력 항목의 의미와 확인 방법을 안내합니다.",
		suggestedQuestions: [
			{ id: "t2p-1", text: "공시가격은 실거래가랑 다른 건가요?", category: "explain" },
			{ id: "t2p-2", text: "공동명의 여부는 왜 입력하나요?", category: "explain" },
			{ id: "t2p-3", text: "합산배제 대상 여부가 뭐예요?", category: "explain" },
			{ id: "t2p-4", text: "조정대상지역은 어떻게 확인하나요?", category: "help" },
		],
	},

	track2_scenario: {
		greeting: "시나리오 설정을 도와드릴게요.",
		description: "템플릿과 직접 입력의 차이를 설명합니다.",
		suggestedQuestions: [
			{ id: "t2s-1", text: "템플릿을 써야 하나요, 직접 입력해야 하나요?", category: "help" },
			{ id: "t2s-2", text: "시나리오 B와 C 차이가 뭐예요?", category: "explain" },
			{ id: "t2s-3", text: "이것도 똑같이 넣으면 되나요?", category: "help" },
		],
	},

	track2_result: {
		greeting: "시뮬레이션 결과가 나왔습니다!",
		description: "시나리오별 결과를 비교해서 설명해 드릴게요.",
		suggestedQuestions: [
			{ id: "t2r-1", text: "어떤 시나리오가 더 불리한가요?", category: "interpret" },
			{ id: "t2r-2", text: "왜 B와 C 결과가 차이나나요?", category: "interpret" },
			{ id: "t2r-3", text: "계산과정을 쉽게 설명해주세요", category: "interpret" },
			{ id: "t2r-4", text: "세무사에게 어떤 점을 물어봐야 할까요?", category: "prepare" },
		],
	},

	// ─── 공통 화면 ───

	home: {
		greeting: "안녕하세요! 수지 AI입니다.",
		description: "수지하우스 서비스에 대해 궁금한 점을 물어보세요.",
		suggestedQuestions: [
			{ id: "h-1", text: "어떤 서비스를 이용할 수 있나요?", category: "explain" },
			{ id: "h-2", text: "청년 소득세 감면이 뭔가요?", category: "explain" },
			{ id: "h-3", text: "부동산 세금 비교는 어떻게 하나요?", category: "explain" },
		],
	},

	tax_service: {
		greeting: "세무서비스 메뉴입니다.",
		description: "어떤 서비스가 나에게 맞는지 안내해 드릴게요.",
		suggestedQuestions: [
			{ id: "ts-1", text: "어떤 서비스를 먼저 해야 하나요?", category: "help" },
			{ id: "ts-2", text: "시즌 서비스와 상시 서비스 차이가 뭔가요?", category: "explain" },
		],
	},

	lifecycle: {
		greeting: "생애주기 서비스입니다.",
		description: "나이와 상황에 맞는 세무 서비스를 안내합니다.",
		suggestedQuestions: [
			{ id: "lc-1", text: "생애주기별로 어떤 서비스가 있나요?", category: "explain" },
			{ id: "lc-2", text: "내 나이에 맞는 서비스는 뭔가요?", category: "help" },
		],
	},

	consultant_list: {
		greeting: "세무사 상담을 준비하고 계시군요!",
		description: "상담 전 준비할 내용을 정리해 드릴게요.",
		suggestedQuestions: [
			{ id: "cl-1", text: "세무사에게 어떻게 말해야 하나요?", category: "prepare" },
			{ id: "cl-2", text: "무엇을 질문하면 좋을까요?", category: "prepare" },
			{ id: "cl-3", text: "상담 전 준비할 서류가 있나요?", category: "prepare" },
		],
	},

	consultant_chat: {
		greeting: "세무사 상담 중이시군요.",
		description: "상담에 도움이 될 정보를 제공합니다.",
		suggestedQuestions: [
			{ id: "cc-1", text: "상담 내용을 요약해주세요", category: "prepare" },
			{ id: "cc-2", text: "추가로 물어볼 것이 있을까요?", category: "prepare" },
		],
	},

	mypage: {
		greeting: "마이페이지입니다.",
		description: "계정이나 서비스 이용에 대해 안내합니다.",
		suggestedQuestions: [
			{ id: "mp-1", text: "이전 시뮬레이션 결과를 볼 수 있나요?", category: "help" },
			{ id: "mp-2", text: "개인정보는 어떻게 관리되나요?", category: "explain" },
		],
	},

	default: {
		greeting: "안녕하세요! 수지 AI입니다.",
		description: "세무 관련 궁금한 점을 물어보세요.",
		suggestedQuestions: [
			{ id: "d-1", text: "어떤 서비스를 이용할 수 있나요?", category: "explain" },
			{ id: "d-2", text: "도움이 필요해요", category: "help" },
		],
	},
};

/** 카테고리 레이블 */
export const QUESTION_CATEGORY_LABELS: Record<SuggestedQuestion["category"], string> = {
	explain: "용어 설명",
	help: "입력 도움",
	interpret: "결과 해석",
	prepare: "상담 준비",
};

/** 카테고리 아이콘 */
export const QUESTION_CATEGORY_ICONS: Record<SuggestedQuestion["category"], string> = {
	explain: "book-outline",
	help: "help-circle-outline",
	interpret: "analytics-outline",
	prepare: "document-text-outline",
};

/** AI 목업 응답 (화면 컨텍스트별) */
export const AI_MOCK_RESPONSES: Record<string, string[]> = {
	// Track1 기본정보
	"최초 중소기업 취업일이 뭐예요?": [
		"'최초 중소기업 취업일'은 처음으로 중소기업에 취업한 날짜를 의미합니다.\n\n이직을 하셨더라도 최초 중소기업 취업일이 기준이 됩니다. 감면 기간은 이 날짜부터 시작됩니다.",
	],
	"사업자등록번호는 어디서 확인하나요?": [
		"사업자등록번호는 다음 경로에서 확인할 수 있습니다:\n\n1. 급여명세서\n2. 재직증명서\n3. 회사 사업자등록증\n4. 국세청 홈택스 > 근로소득 지급명세서\n\n현재 근무 중인 회사의 사업자등록번호를 입력해주세요.",
	],
	"우리 회사가 중소기업인지 모르겠어요": [
		"중소기업 여부는 다음과 같이 확인할 수 있습니다:\n\n1. 회사 인사/총무팀에 문의\n2. 중소기업현황정보시스템(sminfo.mss.go.kr) 검색\n3. 재직증명서에 기재된 기업 규모 확인\n\n정확한 판단은 별도 확인이 필요하며, 시뮬레이션에서는 입력 기준으로 계산됩니다.",
	],

	// Track1 병역
	"왜 병역 정보를 입력해야 하나요?": [
		"병역 정보는 감면 적용기간 계산에 영향을 줍니다.\n\n남성 군필자의 경우 복무기간(최대 6년)만큼 감면 시작 나이를 차감해주기 때문에, 더 많은 연도에 대해 감면을 받을 수 있습니다.\n\n여성의 경우 병역 차감이 적용되지 않으므로 만 나이가 그대로 적용됩니다.",
	],

	// Track1 소득자료
	"자동조회와 수동입력은 뭐가 다른가요?": [
		"**자동 조회**: 간편인증(카카오, PASS 등)을 통해 국세청에서 소득 데이터를 자동으로 불러옵니다. 정확하고 편리합니다.\n\n**수동 입력**: 원천징수영수증을 보고 직접 금액을 입력합니다. 자동조회가 안 될 때 사용합니다.\n\n가능하시면 자동 조회를 권장드립니다.",
	],
	"결정세액이 뭐예요?": [
		"결정세액은 최종적으로 내야 할 세금 금액입니다.\n\n세금 계산 과정:\n산출세액(세율 적용) → 세액공제 차감 → **결정세액**\n\n쉽게 말해, 모든 공제를 다 적용한 후 확정된 세금이라고 생각하시면 됩니다.\n\n원천징수영수증의 '[77] 결정세액' 항목에서 확인할 수 있습니다.",
	],

	// Track1 결과
	"이 결과가 무슨 뜻인가요?": [
		"시뮬레이션 결과를 정리하면:\n\n1. **감면 대상 여부**: 입력하신 정보 기준으로 청년 소득세 감면 대상인지 판별한 결과입니다.\n2. **예상 환급액**: 감면을 적용했을 때 돌려받을 수 있는 예상 금액입니다.\n3. **연도별 상세**: 각 연도별로 얼마나 환급받을 수 있는지 보여줍니다.\n\n이 결과는 시뮬레이션 추정값이며, 실제 환급액은 세무사 검토 후 달라질 수 있습니다.",
	],

	// Track2 안내
	"이 기능은 뭘 보는 건가요?": [
		"이 기능은 2주택자의 주택 보유 형태에 따른 세금 차이를 비교하는 시뮬레이션입니다.\n\n6가지 시나리오로 비교합니다:\n- A주택 양도 / 증여 / 부담부증여\n- B주택 양도 / 증여 / 부담부증여\n\n비중과(현재 유예)와 중과(유예 만료 후) 두 가지 세율로 각각 계산하여, 어떤 선택이 세금 부담이 적은지 한눈에 비교할 수 있습니다.",
	],
	"공시가격은 실거래가랑 다른 건가요?": [
		"네, 다릅니다.\n\n**공시가격**: 정부가 매년 공시하는 기준 가격으로, 세금 계산에 사용됩니다.\n**실거래가**: 실제 매매 시 거래된 가격입니다.\n\n보통 공시가격은 실거래가의 60~80% 수준입니다.\n\n공시가격은 '부동산 공시가격 알리미(realtyprice.kr)'에서 확인할 수 있습니다.",
	],
	"합산배제 대상 여부가 뭐예요?": [
		"합산배제란 종합부동산세 계산 시 특정 주택을 과세 합산 대상에서 제외하는 것입니다.\n\n해당되는 경우:\n- 임대사업자 등록 주택\n- 사원용 주택\n- 기숙사 등\n\n일반적인 주거용 주택은 대부분 합산 대상이므로, 확실하지 않으시면 '아니오'를 선택하셔도 됩니다.",
	],

	// Track2 결과
	"어떤 시나리오가 더 불리한가요?": [
		"결과표에서 '중과 합계' 금액이 높은 시나리오가 세금 부담이 더 큰 시나리오입니다.\n\n특히 '중과 증가' 열을 확인하시면, 중과 유예가 끝났을 때 현재 대비 얼마나 세금이 증가하는지 바로 확인할 수 있습니다.\n\n세무사 상담 시 이 비교 결과를 함께 전달하시면 더 정확한 조언을 받으실 수 있습니다.",
	],

	// 공통 상담 준비
	"세무사에게 어떻게 말해야 하나요?": [
		"세무사 상담 시 다음 내용을 전달하시면 좋습니다:\n\n1. **현재 상황**: 나이, 취업 시기, 근무 회사 정보\n2. **시뮬레이션 결과**: 예상 환급액, 감면 대상 여부\n3. **궁금한 점**: 실제 환급 가능성, 필요 서류, 수수료\n\n시뮬레이션 결과 PDF를 첨부하시면 세무사가 더 빠르게 파악할 수 있습니다.",
	],
	"무엇을 질문하면 좋을까요?": [
		"세무사에게 이런 질문을 해보세요:\n\n1. \"시뮬레이션 결과가 맞는지 확인해주실 수 있나요?\"\n2. \"실제 경정청구를 진행하려면 어떤 서류가 필요한가요?\"\n3. \"환급까지 예상 소요 기간이 얼마나 되나요?\"\n4. \"수수료 구조는 어떻게 되나요?\"\n5. \"추가로 절세할 수 있는 방법이 있나요?\"",
	],
};

/** 일반 AI 응답 (매칭되는 특정 응답이 없을 때) */
export const AI_GENERAL_RESPONSES = [
	"좋은 질문이에요! 해당 내용에 대해 설명드리겠습니다.\n\n이 부분은 세무 관련 전문 영역이므로, 정확한 판단은 세무사 상담을 권장드립니다. 시뮬레이션 결과를 참고하시면 대략적인 방향을 잡으실 수 있습니다.",
	"네, 이해가 어려우실 수 있습니다.\n\n해당 항목은 세금 계산에서 중요한 부분인데, 궁금하신 점을 좀 더 구체적으로 말씀해 주시면 더 자세히 안내해 드릴 수 있습니다.",
	"좋은 질문이십니다.\n\n이 부분은 개별 상황에 따라 달라질 수 있어요. 화면에 표시된 도움말을 참고하시고, 추가 궁금한 점이 있으시면 편하게 물어보세요.",
	"알겠습니다! 이 부분에 대해 안내해 드릴게요.\n\n해당 내용은 입력하신 정보를 기준으로 계산된 결과입니다. 실제 세액과는 차이가 있을 수 있으니, 정확한 확인은 세무사 상담을 추천합니다.",
];
