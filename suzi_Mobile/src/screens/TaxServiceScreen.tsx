import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { TAX_SERVICE_CARDS } from "../constants";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { DISCLAIMER_TEXTS } from "../constants";
import { useAIChatScreen } from "../hooks/useAIChatScreen";

const TaxServiceScreen = () => {
	const navigation = useNavigation<any>();
	useAIChatScreen("tax_service");

	const seasonCards = TAX_SERVICE_CARDS.filter((c) => c.type === "season");
	const alwaysCards = TAX_SERVICE_CARDS.filter((c) => c.type === "always");
	const upcomingCards = TAX_SERVICE_CARDS.filter((c) => c.type === "upcoming");

	const renderCard = (card: (typeof TAX_SERVICE_CARDS)[0]) => {
		const isUpcoming = card.type === "upcoming";

		return (
			<TouchableOpacity
				key={card.id}
				style={[styles.serviceCard, isUpcoming && styles.serviceCardDisabled]}
				disabled={isUpcoming}
				onPress={() => card.route && navigation.navigate(card.route)}
				activeOpacity={0.7}
			>
				<View style={styles.cardTop}>
					<View
						style={[
							styles.cardIconWrap,
							card.type === "season" && { backgroundColor: COLORS.teal50 },
							card.type === "always" && { backgroundColor: COLORS.blue50 },
							isUpcoming && { backgroundColor: COLORS.gray100 },
						]}
					>
						<Ionicons
							name={card.icon as any}
							size={28}
							color={
								card.type === "season"
									? COLORS.teal600
									: card.type === "always"
										? COLORS.blue600
										: COLORS.gray400
							}
						/>
					</View>
					{card.type === "season" && card.dDay && (
						<View style={styles.dDayBadge}>
							<Text style={styles.dDayText}>D-{card.dDay}</Text>
						</View>
					)}
					{isUpcoming && (
						<View style={styles.comingSoonBadge}>
							<Text style={styles.comingSoonText}></Text>
						</View>
					)}
				</View>
				<Text style={[styles.cardTitle, isUpcoming && { color: COLORS.gray400 }]}>{card.title}</Text>
				<Text style={styles.cardSubtitle}>{card.subtitle}</Text>
				{!isUpcoming && (
					<View style={styles.cardArrow}>
						<Text
							style={[
								styles.cardArrowText,
								card.type === "season" ? { color: COLORS.teal600 } : { color: COLORS.blue600 },
							]}
						>
							시뮬레이션 시작
						</Text>
						<Ionicons
							name="arrow-forward"
							size={16}
							color={card.type === "season" ? COLORS.teal600 : COLORS.blue600}
						/>
					</View>
				)}
				{isUpcoming && (
					<TouchableOpacity style={styles.notifyButton}>
						<Ionicons name="notifications-outline" size={14} color={COLORS.gray500} />
						<Text style={styles.notifyText}>출시 알림 받기</Text>
					</TouchableOpacity>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* 헤더 */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>세무서비스</Text>
					<Text style={styles.headerSubtitle}>세금 관련 시뮬레이션으로 의사결정을 지원합니다</Text>
				</View>

				{/* 시즌 서비스 */}
				{seasonCards.length > 0 && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<View style={[styles.sectionBadge, { backgroundColor: COLORS.teal50 }]}>
								<Ionicons name="calendar-outline" size={14} color={COLORS.teal600} />
								<Text style={[styles.sectionBadgeText, { color: COLORS.teal600 }]}>시즌 서비스</Text>
							</View>
						</View>
						{seasonCards.map(renderCard)}
					</View>
				)}

				{/* 상시 서비스 */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<View style={[styles.sectionBadge, { backgroundColor: COLORS.blue50 }]}>
							<Ionicons name="infinite-outline" size={14} color={COLORS.blue600} />
							<Text style={[styles.sectionBadgeText, { color: COLORS.blue600 }]}>상시 서비스</Text>
						</View>
					</View>
					{alwaysCards.map(renderCard)}
				</View>

				{/* 준비 중 */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<View style={[styles.sectionBadge, { backgroundColor: COLORS.gray100 }]}>
							<Ionicons name="time-outline" size={14} color={COLORS.gray500} />
							<Text style={[styles.sectionBadgeText, { color: COLORS.gray500 }]}>출시 예정 서비스</Text>
						</View>
					</View>
					<View style={styles.upcomingRow}>{upcomingCards.map(renderCard)}</View>
				</View>

				{/* 면책 고지 */}
				<View style={[styles.section, { paddingBottom: 40 }]}>
					<DisclaimerBanner text={DISCLAIMER_TEXTS.general} />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	headerSubtitle: { fontSize: 14, color: COLORS.gray500 },

	section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl },
	sectionHeader: { marginBottom: SPACING.md },
	sectionBadge: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 4,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
	},
	sectionBadgeText: { fontSize: 13, fontWeight: "700" },

	serviceCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.xl,
		padding: SPACING.xl,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	serviceCardDisabled: {
		backgroundColor: COLORS.gray50,
		borderColor: COLORS.gray200,
	},
	cardTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: SPACING.md,
	},
	cardIconWrap: {
		width: 52,
		height: 52,
		borderRadius: RADIUS.md,
		justifyContent: "center",
		alignItems: "center",
	},
	dDayBadge: {
		backgroundColor: COLORS.red50,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
	},
	dDayText: { fontSize: 12, fontWeight: "700", color: COLORS.red500 },
	comingSoonBadge: {
		backgroundColor: COLORS.gray200,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
	},
	comingSoonText: { fontSize: 12, fontWeight: "600", color: COLORS.gray500 },
	cardTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		lineHeight: 26,
		marginBottom: SPACING.xs,
	},
	cardSubtitle: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.md },
	cardArrow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	cardArrowText: { fontSize: 14, fontWeight: "600" },
	notifyButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: COLORS.gray100,
		alignSelf: "flex-start",
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.full,
	},
	notifyText: { fontSize: 13, color: COLORS.gray500, fontWeight: "600" },

	upcomingRow: {
		flexDirection: "row",
		gap: SPACING.md,
	},
});

export default TaxServiceScreen;
