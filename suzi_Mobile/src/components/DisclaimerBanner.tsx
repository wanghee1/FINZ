import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";

interface Props {
	text?: string;
	texts?: string[];
	type?: "info" | "warning" | "legal";
}

const DisclaimerBanner: React.FC<Props> = ({ text, texts, type = "info" }) => {
	const isWarning = type === "warning";
	const isLegal = type === "legal";

	const iconName = isWarning
		? "warning-outline"
		: isLegal
			? "shield-checkmark-outline"
			: "information-circle-outline";

	const iconColor = isWarning ? COLORS.orange600 : isLegal ? COLORS.blue600 : COLORS.gray500;

	const containerStyle = [styles.container, isWarning && styles.warningContainer, isLegal && styles.legalContainer];

	const textStyle = [styles.text, isWarning && styles.warningText, isLegal && styles.legalText];

	const allTexts = texts || (text ? [text] : []);

	if (allTexts.length === 0) return null;

	return (
		<View style={containerStyle}>
			<Ionicons name={iconName as any} size={18} color={iconColor} style={styles.icon} />
			<View style={styles.textWrap}>
				{allTexts.length === 1 ? (
					<Text style={textStyle}>{allTexts[0]}</Text>
				) : (
					allTexts.map((t, i) => (
						<View key={i} style={styles.bulletRow}>
							<Text style={[textStyle, styles.bullet]}>•</Text>
							<Text style={[textStyle, styles.bulletText]}>{t}</Text>
						</View>
					))
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.sm,
		padding: SPACING.md,
		borderLeftWidth: 3,
		borderLeftColor: COLORS.gray300,
	},
	warningContainer: {
		backgroundColor: COLORS.orange50,
		borderLeftColor: COLORS.orange500,
	},
	legalContainer: {
		backgroundColor: COLORS.blue50,
		borderLeftColor: COLORS.blue500,
	},
	icon: {
		marginRight: SPACING.sm,
		marginTop: 1,
	},
	textWrap: {
		flex: 1,
	},
	text: {
		fontSize: 12,
		color: COLORS.gray600,
		lineHeight: 18,
	},
	warningText: {
		color: COLORS.orange600,
	},
	legalText: {
		color: COLORS.blue600,
	},
	bulletRow: {
		flexDirection: "row",
		marginBottom: 2,
	},
	bullet: {
		marginRight: 4,
		fontSize: 12,
		lineHeight: 18,
	},
	bulletText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 18,
	},
});

export default DisclaimerBanner;
