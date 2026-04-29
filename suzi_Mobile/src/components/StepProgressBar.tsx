import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../theme";

interface StepProgressBarProps {
	/** 각 단계 라벨 배열 */
	stepLabels: string[];
	/** 현재 활성 단계 인덱스 (0-based) */
	currentIndex: number;
	/** 진행 바 강조 색상 (기본: teal600) */
	accentColor?: string;
}

/**
 * 다단계 위저드 진행 표시 바
 * Track1, Track2 등 멀티스텝 시뮬레이션에서 공용 사용
 */
const StepProgressBar: React.FC<StepProgressBarProps> = ({
	stepLabels,
	currentIndex,
	accentColor = COLORS.teal600,
}) => {
	const progressPercent = ((currentIndex + 1) / stepLabels.length) * 100;

	return (
		<View style={styles.container}>
			<View style={styles.bar}>
				<View
					style={[
						styles.fill,
						{
							width: `${progressPercent}%`,
							backgroundColor: accentColor,
						},
					]}
				/>
			</View>
			<View style={styles.labelRow}>
				{stepLabels.map((label, index) => {
					const isCompleted = index < currentIndex;
					const isActive = index === currentIndex;

					return (
						<View key={index} style={styles.step}>
							<View
								style={[
									styles.dot,
									(isActive || isCompleted) && {
										backgroundColor: accentColor,
									},
								]}
							>
								{isCompleted ? (
									<Ionicons name="checkmark" size={10} color={COLORS.white} />
								) : (
									<Text style={[styles.dotText, (isActive || isCompleted) && styles.dotTextActive]}>
										{index + 1}
									</Text>
								)}
							</View>
							<Text style={[styles.label, isActive && { color: accentColor, fontWeight: "700" }]}>
								{label}
							</Text>
						</View>
					);
				})}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: SPACING.xl,
	},
	bar: {
		height: 3,
		backgroundColor: COLORS.gray200,
		borderRadius: 2,
	},
	fill: {
		height: "100%",
		borderRadius: 2,
	},
	labelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: SPACING.sm,
		marginBottom: SPACING.xs,
	},
	step: {
		alignItems: "center",
		flex: 1,
	},
	dot: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: COLORS.gray200,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 2,
	},
	dotText: {
		fontSize: 10,
		fontWeight: "700",
		color: COLORS.gray500,
	},
	dotTextActive: {
		color: COLORS.white,
	},
	label: {
		fontSize: 10,
		color: COLORS.gray400,
	},
});

export default StepProgressBar;
