/**
 * 공용 스타일 정의
 * 여러 스크린에서 반복 사용되는 스타일을 통합 관리
 */
import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../theme";

/** 폼 관련 공용 스타일 */
export const formStyles = StyleSheet.create({
	group: {
		marginBottom: SPACING.lg,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray700,
		marginBottom: SPACING.sm,
	},
	input: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md + 2,
		fontSize: 15,
		color: COLORS.gray900,
		backgroundColor: COLORS.gray50,
	},
	hint: {
		fontSize: 12,
		color: COLORS.gray400,
		marginTop: SPACING.xs,
		lineHeight: 17,
	},
	requiredStar: {
		color: COLORS.red500,
		fontSize: 14,
	},
});

/** 카드 레이아웃 공용 스타일 */
export const cardStyles = StyleSheet.create({
	container: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: SPACING.md,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.gray800,
	},
});

/** 토글 버튼 공용 스타일 */
export const toggleStyles = StyleSheet.create({
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: SPACING.lg,
	},
	button: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
	},
	buttonActive: {
		backgroundColor: COLORS.teal600,
	},
	text: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray500,
	},
	textActive: {
		color: COLORS.white,
	},
});

/** 스크린 레이아웃 공용 스타일 */
export const layoutStyles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: COLORS.white,
	},
	safeAreaBg: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	section: {
		paddingHorizontal: SPACING.xl,
		marginBottom: SPACING.xxl,
	},
});

/** 배지 공용 스타일 */
export const badgeStyles = StyleSheet.create({
	container: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		alignSelf: "flex-start",
	},
	text: {
		fontSize: 12,
		fontWeight: "700",
	},
});

/** 액션 버튼 행 공용 스타일 */
export const actionStyles = StyleSheet.create({
	row: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: SPACING.xxl,
		marginBottom: SPACING.lg,
	},
	button: {
		alignItems: "center",
		gap: SPACING.xs,
		padding: SPACING.md,
	},
	buttonText: {
		fontSize: 12,
		fontWeight: "600",
	},
});
