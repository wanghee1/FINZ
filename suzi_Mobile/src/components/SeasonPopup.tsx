import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";

interface Props {
	visible: boolean;
	onClose: () => void;
	onAction: () => void;
}

const SeasonPopup: React.FC<Props> = ({ visible, onClose, onAction }) => {
	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.overlay}>
				<View style={styles.popup}>
					{/* 닫기 */}
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<Ionicons name="close" size={24} color={COLORS.gray400} />
					</TouchableOpacity>

					{/* 아이콘 */}
					<View style={styles.iconCircle}>
						<Ionicons name="megaphone-outline" size={32} color={COLORS.teal600} />
					</View>

					{/* 타이틀 */}
					<Text style={styles.badge}>시즌 서비스</Text>
					<Text style={styles.title}>청년 소득세 감면{"\n"}경정청구 시뮬레이션</Text>
					<Text style={styles.subtitle}>
						만 15~34세 중소기업 근로자라면{"\n"}
						소득세 감면 환급을 받을 수 있습니다
					</Text>

					{/* D-day */}
					<View style={styles.dDayBadge}>
						<Text style={styles.dDayText}>종합소득세 신고기간 D-45</Text>
					</View>

					{/* 버튼 */}
					<TouchableOpacity style={styles.actionButton} onPress={onAction}>
						<Text style={styles.actionButtonText}>지금 확인하기</Text>
						<Ionicons name="arrow-forward" size={18} color={COLORS.white} />
					</TouchableOpacity>

					<TouchableOpacity onPress={onClose}>
						<Text style={styles.dismissText}>오늘 하루 보지 않기</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: SPACING.xl,
	},
	popup: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.xl,
		padding: SPACING.xxl,
		alignItems: "center",
		width: "100%",
		maxWidth: 340,
	},
	closeButton: {
		position: "absolute",
		top: SPACING.md,
		right: SPACING.md,
		padding: SPACING.xs,
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.lg,
		marginTop: SPACING.sm,
	},
	badge: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.teal600,
		backgroundColor: COLORS.teal50,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		overflow: "hidden",
		marginBottom: SPACING.sm,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 28,
		marginBottom: SPACING.sm,
	},
	subtitle: {
		fontSize: 14,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: SPACING.lg,
	},
	dDayBadge: {
		backgroundColor: COLORS.red50,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.xl,
	},
	dDayText: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.red500,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.teal600,
		paddingHorizontal: SPACING.xxl,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		width: "100%",
		justifyContent: "center",
		marginBottom: SPACING.md,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
	dismissText: {
		fontSize: 13,
		color: COLORS.gray400,
		textDecorationLine: "underline",
	},
});

export default SeasonPopup;
