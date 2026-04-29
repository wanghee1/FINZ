import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";

interface PrimaryButtonProps {
	text: string;
	onPress: () => void;
	disabled?: boolean;
	/** 버튼 좌측 아이콘 (Ionicons name) */
	iconLeft?: string;
	/** 버튼 우측 아이콘 (Ionicons name) */
	iconRight?: string;
	/** 버튼 배경색 (기본: teal600) */
	color?: string;
	/** outline 변형: 테두리만, 배경 투명 */
	variant?: "filled" | "outline";
	/** 추가 스타일 */
	style?: ViewStyle;
}

/**
 * 공용 주요 액션 버튼
 * 시뮬레이션 시작, 다음 단계 등 CTA에 사용
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
	text,
	onPress,
	disabled = false,
	iconLeft,
	iconRight,
	color = COLORS.teal600,
	variant = "filled",
	style,
}) => {
	const isOutline = variant === "outline";
	const bgColor = isOutline ? "transparent" : color;
	const textColor = isOutline ? color : COLORS.white;

	return (
		<TouchableOpacity
			style={[
				styles.button,
				{ backgroundColor: bgColor },
				isOutline && { borderWidth: 1, borderColor: color },
				disabled && styles.disabled,
				style,
			]}
			onPress={onPress}
			disabled={disabled}
			accessibilityLabel={text}
		>
			{iconLeft && <Ionicons name={iconLeft as any} size={18} color={textColor} />}
			<Text style={[styles.text, { color: textColor }]}>{text}</Text>
			{iconRight && <Ionicons name={iconRight as any} size={18} color={textColor} />}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		marginTop: SPACING.lg,
	},
	disabled: {
		backgroundColor: COLORS.gray300,
	},
	text: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default PrimaryButton;
