import { StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../theme";

/** Step 3 (소득 자료 입력) 전용 스타일 */
const step3Styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	stepLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.teal600,
		marginBottom: SPACING.xs,
	},
	stepTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.sm,
	},
	stepSubtitle: {
		fontSize: 14,
		color: COLORS.gray500,
		marginBottom: SPACING.xl,
		lineHeight: 20,
	},
	yearRangeCard: {
		flexDirection: "row",
		backgroundColor: COLORS.teal50,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	yearRangeTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.teal700,
		marginBottom: 2,
	},
	yearRangeText: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.teal800,
		marginBottom: 2,
	},
	yearRangeHint: {
		fontSize: 11,
		color: COLORS.teal600,
		lineHeight: 16,
	},
	emptyYearsCard: {
		alignItems: "center",
		backgroundColor: COLORS.orange50,
		padding: SPACING.xxl,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.lg,
		gap: SPACING.sm,
	},
	emptyYearsText: {
		fontSize: 14,
		color: COLORS.orange600,
		textAlign: "center",
		lineHeight: 20,
	},
	modeSelector: {
		flexDirection: "row",
		backgroundColor: COLORS.gray100,
		borderRadius: RADIUS.md,
		padding: 3,
		marginBottom: SPACING.xl,
	},
	modeButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.sm,
		gap: 4,
	},
	modeButtonActive: {
		backgroundColor: COLORS.teal600,
	},
	modeText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray500,
	},
	modeTextActive: {
		color: COLORS.white,
	},
	autoModeCard: {
		flexDirection: "row",
		gap: SPACING.md,
		backgroundColor: COLORS.blue50,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.xl,
		alignItems: "flex-start",
	},
	autoModeText: {
		flex: 1,
		fontSize: 13,
		color: COLORS.blue600,
		lineHeight: 20,
	},
	manualInputSection: {
		gap: SPACING.md,
		marginBottom: SPACING.lg,
	},
	yearInputCard: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray100,
	},
	yearInputHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: SPACING.md,
	},
	yearInputTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	yearInputBadge: {
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	yearInputBadgeText: {
		fontSize: 11,
		fontWeight: "700",
	},
	yearInputGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: SPACING.sm,
	},
	yearInputField: {
		width: "48%" as any,
	},
	miniLabel: {
		fontSize: 12,
		color: COLORS.gray500,
		marginBottom: 4,
	},
	miniInput: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.sm,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		fontSize: 14,
		backgroundColor: COLORS.white,
		color: COLORS.gray900,
	},
	reductionToggle: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginTop: SPACING.md,
		paddingTop: SPACING.md,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray200,
	},
	reductionToggleText: {
		fontSize: 12,
		color: COLORS.gray500,
		flex: 1,
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
	primaryButtonDisabled: {
		backgroundColor: COLORS.gray300,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default step3Styles;
