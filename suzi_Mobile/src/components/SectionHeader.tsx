import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../theme";

interface SectionHeaderProps {
	title: string;
	subtitle?: string;
}

/**
 * 공용 섹션 헤더
 * 제목 + 선택적 부제목 조합으로 화면 내 섹션 구분에 사용
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle }) => {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: SPACING.md,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	subtitle: {
		fontSize: 13,
		color: COLORS.gray500,
		lineHeight: 20,
	},
});

export default SectionHeader;
