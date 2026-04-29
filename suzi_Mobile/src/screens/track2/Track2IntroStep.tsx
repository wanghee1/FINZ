/**
 * Track2 인트로 스텝 — 6Way 세금 비교 소개
 *
 * 2주택자 6Way 비교 서비스 소개, D-Day 카운트다운,
 * 6개 시나리오 카드, 비중과/중과 개념 설명, 면책 고지
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { DISCLAIMER_TEXTS } from "../../constants";
import DisclaimerBanner from "../../components/DisclaimerBanner";
import PrimaryButton from "../../components/PrimaryButton";

interface Track2IntroStepProps {
	onStart: () => void;
}

/** 중과유예 만료일 (2026.5.9) */
const SURCHARGE_DEADLINE = new Date(2026, 4, 9); // month is 0-indexed

/** 6가지 시나리오 미리보기 데이터 */
const SCENARIO_PREVIEWS = [
	{ no: 1, label: "A주택 양도", icon: "swap-horizontal-outline", color: COLORS.teal600 },
	{ no: 2, label: "A주택 증여", icon: "gift-outline", color: COLORS.teal600 },
	{ no: 3, label: "A주택 부담부증여", icon: "documents-outline", color: COLORS.teal600 },
	{ no: 4, label: "B주택 양도", icon: "swap-horizontal-outline", color: COLORS.teal600 },
	{ no: 5, label: "B주택 증여", icon: "gift-outline", color: COLORS.teal600 },
	{ no: 6, label: "B주택 부담부증여", icon: "documents-outline", color: COLORS.teal600 },
] as const;

const Track2IntroStep: React.FC<Track2IntroStepProps> = ({ onStart }) => {
	const dDay = useMemo(() => {
		const now = new Date();
		const diff = SURCHARGE_DEADLINE.getTime() - now.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	}, []);

	return (
		<View style={styles.stepContent}>
			<View style={styles.iconWrap}>
				<Ionicons name="analytics-outline" size={40} color={COLORS.blue600} />
			</View>

			<Text style={styles.title}>{"부동산 세금 비교 시뮬레이션"}</Text>
			<Text style={styles.subtitle}>
				{"두 주택의 양도·증여·부담부증여\n"}
				{"6가지 시나리오를 비교하여 세금을 한눈에 확인할 수 있습니다."}
			</Text>

			{/* D-Day 카운트다운 */}
			<View style={styles.dDayBanner}>
				<Ionicons name="alarm-outline" size={20} color={COLORS.red600} />
				<View style={{ flex: 1 }}>
					<Text style={styles.dDayTitle}>다주택 중과 유예 종료까지 D-{dDay}</Text>
					<Text style={styles.dDayDesc}>2026.5.9 이후 중과세율 적용 시 세금이 크게 달라집니다</Text>
				</View>
			</View>

			{/* 6개 시나리오 카드 */}
			<Text style={styles.sectionLabel}>6가지 비교 시나리오</Text>
			<View style={styles.scenarioGrid}>
				{SCENARIO_PREVIEWS.map((s) => (
					<View key={s.no} style={styles.scenarioCard}>
						<View style={[styles.scenarioIcon, { backgroundColor: s.color + "15" }]}>
							<Ionicons name={s.icon as any} size={20} color={s.color} />
						</View>
						<Text style={styles.scenarioNo}>{s.no}</Text>
						<Text style={styles.scenarioLabel}>{s.label}</Text>
					</View>
				))}
			</View>

			{/* 비중과/중과 개념 설명 */}
			<View style={styles.conceptCard}>
				<Text style={styles.conceptTitle}>비중과 vs 중과란?</Text>
				<View style={styles.conceptRow}>
					<View style={[styles.conceptBadge, { backgroundColor: COLORS.green100 }]}>
						<Text style={[styles.conceptBadgeText, { color: COLORS.green600 }]}>비중과</Text>
					</View>
					<Text style={styles.conceptDesc}>현재 유예 기간 중 적용되는 일반 세율</Text>
				</View>
				<View style={styles.conceptRow}>
					<View style={[styles.conceptBadge, { backgroundColor: COLORS.red100 }]}>
						<Text style={[styles.conceptBadgeText, { color: COLORS.red600 }]}>중과</Text>
					</View>
					<Text style={styles.conceptDesc}>유예 종료 후 다주택자에게 적용되는 높은 세율</Text>
				</View>
			</View>

			{/* 면책 고지 */}
			<DisclaimerBanner text={DISCLAIMER_TEXTS.track2NotTaxAgent} type="warning" />
			<View style={{ height: SPACING.sm }} />
			<DisclaimerBanner text={DISCLAIMER_TEXTS.track2Scenario} type="info" />

			<PrimaryButton text="시뮬레이션 시작" onPress={onStart} iconRight="arrow-forward" color={COLORS.blue600} />
		</View>
	);
};

const styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.xxl,
	},
	iconWrap: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: COLORS.blue50,
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "center",
		marginBottom: SPACING.lg,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 34,
		marginBottom: SPACING.md,
	},
	subtitle: {
		fontSize: 15,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: SPACING.xxl,
	},
	// D-Day 배너
	dDayBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		backgroundColor: COLORS.red50,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.red100,
	},
	dDayTitle: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.red600,
		marginBottom: 2,
	},
	dDayDesc: {
		fontSize: 12,
		color: COLORS.gray500,
	},
	// 시나리오 그리드
	sectionLabel: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray700,
		marginBottom: SPACING.md,
	},
	scenarioGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
	},
	scenarioCard: {
		width: "31%",
		alignItems: "center",
		backgroundColor: COLORS.gray50,
		padding: SPACING.md,
		borderRadius: RADIUS.md,
	},
	scenarioIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.xs,
	},
	scenarioNo: {
		fontSize: 11,
		fontWeight: "700",
		color: COLORS.gray400,
		marginBottom: 2,
	},
	scenarioLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.gray700,
		textAlign: "center",
	},
	// 개념 설명
	conceptCard: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.xl,
	},
	conceptTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray800,
		marginBottom: SPACING.md,
	},
	conceptRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		marginBottom: SPACING.sm,
	},
	conceptBadge: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
	},
	conceptBadgeText: {
		fontSize: 13,
		fontWeight: "700",
	},
	conceptDesc: {
		fontSize: 13,
		color: COLORS.gray600,
		flex: 1,
	},
});

export default Track2IntroStep;
