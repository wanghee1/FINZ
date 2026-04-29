import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../theme";

interface TopBarProps {
	title: string;
	onBack: () => void;
	/** 우측 영역 커스텀 렌더링 (기본: 24px 빈 공간) */
	rightElement?: React.ReactNode;
}

/**
 * 공용 상단 네비게이션 바
 * 모든 스택 스크린에서 일관된 뒤로가기 + 타이틀 레이아웃 제공
 */
const TopBar: React.FC<TopBarProps> = ({ title, onBack, rightElement }) => {
	return (
		<View style={styles.container}>
			<TouchableOpacity onPress={onBack}>
				<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
			</TouchableOpacity>
			<Text style={styles.title}>{title}</Text>
			{rightElement ?? <View style={styles.placeholder} />}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
	},
	title: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	placeholder: {
		width: 24,
	},
});

export default TopBar;
