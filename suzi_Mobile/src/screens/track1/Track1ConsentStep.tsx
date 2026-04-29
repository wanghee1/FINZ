import React, { useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";

interface Track1ConsentStepProps {
	onAgree: () => void;
}

// ── 동의 항목 정의 ──

interface ConsentItem {
	id: string;
	title: string;
	required: boolean;
	content: string;
}

const CONSENT_ITEMS: ConsentItem[] = [
	{
		id: "privacy",
		title: "개인정보 수집 및 이용 동의",
		required: true,
		content: `[개인정보 수집 및 이용 동의]

주식회사 FINZ(이하 "회사")는 관련 법령에 따라 아래의 목적으로 개인정보를 수집 및 이용하고자 동의를 요청합니다.

관련 법령: "개인정보 보호법", "전자상거래 등에서의 소비자보호에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등

1. 수집 항목
• 이용자의 성명, 생년월일, 이동전화번호
• 연계정보(CI), 중복가입확인정보(DI)
• 이용자가 이용하는 앱 정보, 이용일시
• 내외국인 여부, 성별
• 가입한 간편인증 사업자

2. 이용 목적
• 이용자 식별, 고객상담 및 민원처리
• 홈택스 간편인증을 통한 본인확인 및 본인인증(전자서명)
• 근로소득 지급명세서 자동 조회 및 경정청구 예상 환급액 계산
• 서비스 관련 상담 및 불만 처리
• 서비스 이용 선호도 분석

3. 수집/처리 항목 (경정청구 예상 세액 조회)
• 홈택스 간편인증 정보: 이름, 전화번호, 생년월일, 성별
• 근로소득 지급명세서: 총급여, 산출세액, 근로소득세액공제, 감면세액, 결정세액
• 결과 정보: 서비스 이용내역(예상 환급액 결과 등)

4. 보유 및 이용 기간
• 홈택스 간편인증 정보: 조회 완료 후 즉시 파기 (서버에 저장하지 않음)
• 근로소득 지급명세서 데이터: 조회 완료 후 즉시 파기 (계산에만 활용, 서버에 저장하지 않음)
• 시뮬레이션 결과: 사용자가 저장을 선택한 경우에만 보관, 회원 탈퇴 시 즉시 파기
• 단, 관련 법규에 의해 별도 규정이 있는 경우 그 기간을 따름

※ 회원은 위와 같은 개인정보의 수집 및 이용을 거부할 수 있습니다. 단, 동의하지 않을 경우 경정청구 예상 환급액 조회 서비스 이용이 불가합니다.`,
	},
	{
		id: "sensitive",
		title: "민감정보 수집 및 이용 동의",
		required: true,
		content: `[민감정보 수집 및 이용 동의]

주식회사 FINZ(이하 "회사")는 관련 법령에 따라 아래의 목적으로 민감정보를 수집 및 이용하고자 동의를 요청합니다.

관련 법령: "개인정보 보호법", "전자상거래 등에서의 소비자보호에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등

1. 수집/처리 목적
• 이용자 식별, 고객상담 및 민원처리
• 종합소득세 예상 세액 조회 및 계산
• 중소기업 취업자 소득세 감면 경정청구 대상자 조회

2. 수집/처리 항목
• 근로소득 지급명세서 상의 소득 및 세액 정보
• 중소기업 취업자 소득세 감면 관련 정보 (감면기간, 감면세액 등)
• 소득공제 및 세액공제 관련 정보 (해당하는 경우)

3. 보유 및 이용 기간
• 조회 완료 후 즉시 파기 (서버에 저장하지 않음, 계산에만 활용)
• 시뮬레이션 결과: 사용자가 저장을 선택한 경우에만 보관
• 환급액이 없는 경우: 즉시 파기
• 단, 관련 법규에 의해 별도 규정이 있는 경우 그 기간을 따름

※ 회원은 위와 같은 민감정보의 수집 및 이용을 거부할 수 있습니다. 단, 동의하지 않을 경우 서비스 이용이 불가합니다.`,
	},
	{
		id: "thirdparty",
		title: "제3자 정보제공 동의",
		required: true,
		content: `[제3자 정보제공 동의]

FINZ는 정보주체의 동의, 법률에 특별한 규정이 있는 경우 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

1. 용어의 정의
• 연계정보(CI): 특정 개인을 식별하기 위해 본인확인기관에서 생성한 암호화된 개인식별번호
• 인증사업자: 카카오, 통신사패스(PASS), KB국민은행, 한국정보인증(삼성패스), 신한은행, 네이버, 토스 등 전자서명 서비스를 제공하는 사업자
• 본인확인기관: 코리아크레딧뷰로(KCB) 등 본인확인 서비스를 제공하는 사업자

2. 제3자 제공에 관한 사항
• 개인정보를 제공받는 자: 인증사업자, 본인확인기관, 국세청(홈택스)
• 제공받는 자의 이용목적: 간편인증 시 본인확인 또는 전자서명, 근로소득 지급명세서 조회
• 제공하는 개인정보 항목: 성명, 생년월일, 휴대폰번호, 연계정보(CI)
• 제공받는 자의 보유 및 이용기간: 본인확인 또는 전자서명 후 즉시 파기

3. 개인정보 취급위탁
• 수탁자: 카카오, 통신사패스(PASS), KB국민은행, 한국정보인증(삼성패스), 신한은행, 네이버, 토스
• 위탁 업무: 본인확인 정보의 정확성 여부 확인(본인확인서비스 제공), 본인인증 또는 전자서명, 연계정보(CI)/중복가입확인정보(DI) 생성 및 전송

※ 수탁자의 상세 개인정보 취급 위탁 내용은 각 수탁자의 개인정보 처리방침에 따릅니다.

4. 동의 거부권 및 불이익
개인정보 제3자 제공 동의를 거부할 수 있습니다. 다만, 동의 거부 시 간편인증을 통한 소득 데이터 자동 조회 서비스 이용이 제한될 수 있습니다.`,
	},
];

// ── 메인 컴포넌트 ──

const Track1ConsentStep: React.FC<Track1ConsentStepProps> = ({ onAgree }) => {
	const [agreed, setAgreed] = useState<Record<string, boolean>>({});
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [modalContent, setModalContent] = useState<ConsentItem | null>(null);

	const allRequired = CONSENT_ITEMS.filter((c) => c.required);
	const allRequiredAgreed = allRequired.every((c) => agreed[c.id]);
	const allAgreed = CONSENT_ITEMS.every((c) => agreed[c.id]);

	const toggleAll = useCallback(() => {
		if (allAgreed) {
			setAgreed({});
		} else {
			const next: Record<string, boolean> = {};
			CONSENT_ITEMS.forEach((c) => { next[c.id] = true; });
			setAgreed(next);
		}
	}, [allAgreed]);

	const toggleOne = useCallback((id: string) => {
		setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));
	}, []);

	return (
		<View style={s.container}>
			{/* 헤더 */}
			<View style={s.header}>
				<View style={s.headerIcon}>
					<Ionicons name="document-lock-outline" size={32} color={COLORS.teal600} />
				</View>
				<Text style={s.headerTitle}>서비스 이용 동의</Text>
				<Text style={s.headerDesc}>
					경정청구 환급액 조회를 위해{"\n"}아래 약관에 동의해주세요.
				</Text>
			</View>

			{/* 전체 동의 */}
			<TouchableOpacity style={s.allAgreeCard} onPress={toggleAll} activeOpacity={0.7}>
				<View style={[s.checkCircle, allAgreed && s.checkCircleActive]}>
					<Ionicons
						name={allAgreed ? "checkmark" : "checkmark"}
						size={18}
						color={allAgreed ? COLORS.white : COLORS.gray300}
					/>
				</View>
				<Text style={s.allAgreeText}>약관 전체 동의</Text>
			</TouchableOpacity>

			{/* 개별 동의 항목 */}
			<View style={s.itemList}>
				{CONSENT_ITEMS.map((item) => {
					const isAgreed = !!agreed[item.id];
					return (
						<View key={item.id} style={s.itemCard}>
							<TouchableOpacity
								style={s.itemRow}
								onPress={() => toggleOne(item.id)}
								activeOpacity={0.7}
							>
								<View style={[s.itemCheck, isAgreed && s.itemCheckActive]}>
									<Ionicons
										name="checkmark"
										size={14}
										color={isAgreed ? COLORS.white : COLORS.gray300}
									/>
								</View>
								<View style={s.itemTextWrap}>
									<View style={s.itemTitleRow}>
										<Text style={s.itemRequired}>[필수]</Text>
										<Text style={s.itemTitle}>{item.title}</Text>
									</View>
								</View>
								<TouchableOpacity
									style={s.viewBtn}
									onPress={() => setModalContent(item)}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<Text style={s.viewBtnText}>보기</Text>
									<Ionicons name="chevron-forward" size={14} color={COLORS.gray400} />
								</TouchableOpacity>
							</TouchableOpacity>
						</View>
					);
				})}
			</View>

			{/* 안내 문구 */}
			<View style={s.notice}>
				<Ionicons name="information-circle-outline" size={16} color={COLORS.gray400} />
				<Text style={s.noticeText}>
					FINZ는 조회한 소득 데이터를 서버에 저장하지 않고 시뮬레이션 계산에만 사용합니다.
				</Text>
			</View>

			{/* 동의 버튼 */}
			<TouchableOpacity
				style={[s.agreeBtn, !allRequiredAgreed && s.agreeBtnDisabled]}
				onPress={onAgree}
				disabled={!allRequiredAgreed}
				activeOpacity={0.8}
			>
				<Text style={s.agreeBtnText}>동의하고 시작하기</Text>
				<Ionicons name="arrow-forward" size={18} color={COLORS.white} />
			</TouchableOpacity>

			{/* 약관 상세 모달 */}
			<Modal
				visible={!!modalContent}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setModalContent(null)}
			>
				<View style={s.modalContainer}>
					<View style={s.modalHeader}>
						<Text style={s.modalTitle}>{modalContent?.title}</Text>
						<TouchableOpacity onPress={() => setModalContent(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<Ionicons name="close" size={24} color={COLORS.gray600} />
						</TouchableOpacity>
					</View>
					<ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
						<Text style={s.modalText}>{modalContent?.content}</Text>
						<View style={{ height: 40 }} />
					</ScrollView>
					<View style={s.modalFooter}>
						<TouchableOpacity
							style={s.modalAgreeBtn}
							onPress={() => {
								if (modalContent) {
									setAgreed((prev) => ({ ...prev, [modalContent.id]: true }));
								}
								setModalContent(null);
							}}
							activeOpacity={0.8}
						>
							<Text style={s.modalAgreeBtnText}>확인 및 동의</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const s = StyleSheet.create({
	container: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	// ── 헤더 ──
	header: {
		alignItems: "center",
		marginBottom: SPACING.xxl,
	},
	headerIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: COLORS.teal50,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: SPACING.lg,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.sm,
	},
	headerDesc: {
		fontSize: 14,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 21,
	},
	// ── 전체 동의 ──
	allAgreeCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.gray50,
		paddingVertical: 18,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.md,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		gap: SPACING.md,
		marginBottom: SPACING.lg,
	},
	checkCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: COLORS.gray300,
		backgroundColor: COLORS.white,
		alignItems: "center",
		justifyContent: "center",
	},
	checkCircleActive: {
		backgroundColor: COLORS.teal600,
		borderColor: COLORS.teal600,
	},
	allAgreeText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	// ── 개별 항목 ──
	itemList: {
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
	},
	itemCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		overflow: "hidden",
	},
	itemRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: SPACING.lg,
		gap: SPACING.md,
	},
	itemCheck: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: COLORS.gray300,
		backgroundColor: COLORS.white,
		alignItems: "center",
		justifyContent: "center",
	},
	itemCheckActive: {
		backgroundColor: COLORS.teal600,
		borderColor: COLORS.teal600,
	},
	itemTextWrap: {
		flex: 1,
	},
	itemTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	itemRequired: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.teal600,
	},
	itemTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray800,
	},
	viewBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
	viewBtnText: {
		fontSize: 13,
		color: COLORS.gray400,
	},
	// ── 안내 ──
	notice: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
		paddingHorizontal: SPACING.xs,
	},
	noticeText: {
		flex: 1,
		fontSize: 12,
		color: COLORS.gray400,
		lineHeight: 18,
	},
	// ── 동의 버튼 ──
	agreeBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: 16,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
	},
	agreeBtnDisabled: {
		backgroundColor: COLORS.gray300,
	},
	agreeBtnText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
	// ── 모달 ──
	modalContainer: {
		flex: 1,
		backgroundColor: COLORS.white,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	modalBody: {
		flex: 1,
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	modalText: {
		fontSize: 14,
		color: COLORS.gray700,
		lineHeight: 22,
	},
	modalFooter: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray200,
	},
	modalAgreeBtn: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: 16,
		borderRadius: RADIUS.md,
	},
	modalAgreeBtnText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default Track1ConsentStep;
