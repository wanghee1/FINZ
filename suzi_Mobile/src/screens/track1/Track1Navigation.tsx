import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../theme";

// ──────────────────────────────────────────
// 스텝 라벨
// ──────────────────────────────────────────

export const STEP_LABELS = ["서비스 소개", "기본 정보", "병역 정보", "소득 자료", "데이터 수집", "결과"];

// ──────────────────────────────────────────
// 상단 바
// ──────────────────────────────────────────

export const TopBar: React.FC<{
	onBack: () => void;
	onHome?: () => void;
}> = ({ onBack, onHome }) => (
	<View style={styles.topBar}>
		<TouchableOpacity onPress={onBack} accessibilityLabel="뒤로 가기">
			<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
		</TouchableOpacity>
		<Text style={styles.topBarTitle}>청년 소득세 환급</Text>
		{onHome ? (
			<TouchableOpacity onPress={onHome} accessibilityLabel="홈으로 가기">
				<Ionicons name="home-outline" size={22} color={COLORS.gray500} />
			</TouchableOpacity>
		) : (
			<View style={{ width: 24 }} />
		)}
	</View>
);

// ──────────────────────────────────────────
// 진행 바
// ──────────────────────────────────────────

export const ProgressBar: React.FC<{
	stepIndex: number;
}> = ({ stepIndex }) => (
	<View style={styles.progressContainer}>
		<View style={styles.progressBar}>
			<View
				style={[
					styles.progressFill,
					{
						width: `${((stepIndex + 1) / STEP_LABELS.length) * 100}%`,
					},
				]}
			/>
		</View>
		<View style={styles.stepIndicatorRow}>
			{STEP_LABELS.map((label, i) => (
				<View key={i} style={styles.stepIndicator}>
					<View style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]}>
						{i < stepIndex ? (
							<Ionicons name="checkmark" size={10} color={COLORS.white} />
						) : (
							<Text style={[styles.stepDotText, i <= stepIndex && styles.stepDotTextActive]}>
								{i + 1}
							</Text>
						)}
					</View>
					<Text style={[styles.stepLabel, i === stepIndex && styles.stepLabelActive]}>{label}</Text>
				</View>
			))}
		</View>
	</View>
);

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────

const styles = StyleSheet.create({
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
	},
	topBarTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	progressContainer: {
		paddingHorizontal: SPACING.xl,
	},
	progressBar: {
		height: 3,
		backgroundColor: COLORS.gray200,
		borderRadius: 2,
	},
	progressFill: {
		height: "100%",
		backgroundColor: COLORS.teal600,
		borderRadius: 2,
	},
	stepIndicatorRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: SPACING.sm,
		marginBottom: SPACING.xs,
	},
	stepIndicator: {
		alignItems: "center",
		flex: 1,
	},
	stepDot: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: COLORS.gray200,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 2,
	},
	stepDotActive: {
		backgroundColor: COLORS.teal600,
	},
	stepDotText: {
		fontSize: 10,
		fontWeight: "700",
		color: COLORS.gray500,
	},
	stepDotTextActive: {
		color: COLORS.white,
	},
	stepLabel: {
		fontSize: 10,
		color: COLORS.gray400,
	},
	stepLabelActive: {
		color: COLORS.teal600,
		fontWeight: "700",
	},
});
