import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { DISCLAIMER_TEXTS } from "../../constants";
import DisclaimerBanner from "../../components/DisclaimerBanner";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface Track1IntroStepProps {
	onStart: () => void;
}

// ──────────────────────────────────────────
// 인포 카드 데이터
// ──────────────────────────────────────────

const INFO_CARDS = [
	{
		icon: "person-outline",
		title: "대상",
		desc: "중소기업 재직자 중\n청년 (만 15~34세, 군필 시 최대 40세)\n고령자 (만 60세 이상)",
	},
	{
		icon: "calendar-outline",
		title: "감면 기간",
		desc: "청년: 최초 취업일부터 최대 5년\n고령자: 최대 3년",
	},
	{
		icon: "cash-outline",
		title: "감면율",
		desc: "청년 90% / 고령자 70%\n(최초 취업 시기에 따라 상이)",
	},
	{
		icon: "pricetag-outline",
		title: "연간 한도",
		desc: "2022년 이전: 150만원\n2023년 이후: 200만원 (과세연도 기준)",
	},
	{
		icon: "time-outline",
		title: "경정청구",
		desc: "최대 5년 소급 환급 가능\n2026년 기준 2020~2024년 귀속분",
	},
];

// ──────────────────────────────────────────
// 인포 카드 아이템 렌더링
// ──────────────────────────────────────────

const renderInfoCard = (item: { icon: string; title: string; desc: string }, index: number) => (
	<View key={index} style={styles.infoCard}>
		<View style={styles.infoCardIcon}>
			<Ionicons name={item.icon as any} size={20} color={COLORS.teal600} />
		</View>
		<View style={styles.infoCardContent}>
			<Text style={styles.infoCardTitle}>{item.title}</Text>
			<Text style={styles.infoCardDesc}>{item.desc}</Text>
		</View>
	</View>
);

// ──────────────────────────────────────────
// 법적 근거 카드
// ──────────────────────────────────────────

const LegalBasisCard = () => (
	<View style={styles.legalBasisCard}>
		<Ionicons name="document-text-outline" size={18} color={COLORS.teal700} />
		<Text style={styles.legalBasisText}>
			조세특례제한법 제30조{"\n"}
			<Text style={styles.legalBasisSub}>(청년 소득세에 대한 소득세 감면)</Text>
		</Text>
	</View>
);

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────

const Track1IntroStep: React.FC<Track1IntroStepProps> = ({ onStart }) => {
	return (
		<View style={styles.stepContent}>
			<View style={styles.introIconWrap}>
				<Ionicons name="receipt-outline" size={40} color={COLORS.teal600} />
			</View>

			<View style={styles.introBadge}>
				<Text style={styles.introBadgeText}>시즌 서비스 · D-45</Text>
			</View>

			<Text style={styles.introTitle}>청년 소득세{"\n"}환급 확인</Text>
			<Text style={styles.introSubtitle}>
				중소기업에 근무한 청년·고령자라면{"\n"}
				최대 5년치 세금을 돌려받을 수 있습니다
			</Text>

			<LegalBasisCard />

			<View style={styles.infoCards}>{INFO_CARDS.map(renderInfoCard)}</View>

			{/* FR-IT-YT-A-50-01, FR-IT-YT-A-50-02 */}
			<DisclaimerBanner text={DISCLAIMER_TEXTS.notTaxAgent} type="legal" />
			<View style={{ height: SPACING.sm }} />
			<DisclaimerBanner text={DISCLAIMER_TEXTS.track1} type="warning" />

			<TouchableOpacity style={styles.primaryButton} onPress={onStart}>
				<Text style={styles.primaryButtonText}>무료 진단 시작</Text>
			</TouchableOpacity>
		</View>
	);
};

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────

const styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	introIconWrap: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "center",
		marginBottom: SPACING.lg,
	},
	introBadge: {
		alignSelf: "center",
		backgroundColor: COLORS.red50,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.md,
	},
	introBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.red500,
	},
	introTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 34,
		marginBottom: SPACING.md,
	},
	introSubtitle: {
		fontSize: 15,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: SPACING.xl,
	},
	legalBasisCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.teal50,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.xl,
		gap: SPACING.sm,
	},
	legalBasisText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.teal700,
		lineHeight: 20,
	},
	legalBasisSub: {
		fontWeight: "400",
		fontSize: 12,
	},
	infoCards: {
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
	},
	infoCard: {
		flexDirection: "row",
		backgroundColor: COLORS.gray50,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		alignItems: "flex-start",
		gap: SPACING.md,
	},
	infoCardIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
	},
	infoCardContent: {
		flex: 1,
	},
	infoCardTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray800,
		marginBottom: 2,
	},
	infoCardDesc: {
		fontSize: 13,
		color: COLORS.gray500,
		lineHeight: 19,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		marginTop: SPACING.lg,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default Track1IntroStep;
