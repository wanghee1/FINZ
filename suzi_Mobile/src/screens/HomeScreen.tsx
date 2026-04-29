import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { HOME_BANNERS, LIFECYCLE_STAGES, DISCLAIMER_TEXTS } from "../constants";
import SeasonPopup from "../components/SeasonPopup";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { useAuth } from "../context/AuthContext";
import { useAIChatScreen } from "../hooks/useAIChatScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HomeScreen = () => {
	const navigation = useNavigation<any>();
	const { user } = useAuth();
	useAIChatScreen("home");
	const [showSeasonPopup, setShowSeasonPopup] = useState(true);
	const [activeBanner, setActiveBanner] = useState(0);

	const userName = user?.name || "사용자";
	const userAge = user?.birth_date
		? (() => {
			const today = new Date();
			const birth = new Date(user.birth_date);
			let age = today.getFullYear() - birth.getFullYear();
			const monthDiff = today.getMonth() - birth.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
				age--;
			}
			return age;
		})()
		: 28;
	const stageIndexToStage = (idx: number): string => {
		switch (idx) {
			case 0:
				return "FORMATION";
			case 1:
				return "OPERATION";
			case 2:
				return "TRANSFER";
			default:
				return "OPERATION";
		}
	};
	const lifecycleStage = stageIndexToStage(user?.stage_index ?? 1);

	const currentStage = LIFECYCLE_STAGES.find((s) => s.key === lifecycleStage);

	// 연령대별 맞춤 가이드 — 결과 중심 문구
	const guides = [
		...(userAge >= 15 && userAge <= 34
			? [
					{
						icon: "receipt-outline",
						title: "내 세금 환급액은?",
						desc: "1분 안에 예상 환급액을 확인하세요",
						route: "Track1YouthTax",
						color: COLORS.teal600,
						bg: COLORS.teal50,
					},
				]
			: []),
		{
			icon: "analytics-outline",
			title: "팔까? 증여할까?",
			desc: "2주택 처분 시 세금 차이를 바로 비교",
			route: "Track2Property",
			color: COLORS.blue600,
			bg: COLORS.blue50,
		},
		{
			icon: "leaf-outline",
			title: "나에게 맞는 절세 방법은?",
			desc: `${currentStage?.label} 맞춤 서비스를 확인하세요`,
			route: "Lifecycle",
			color: COLORS.purple600,
			bg: COLORS.purple50,
		},
	];

	return (
		<SafeAreaView style={styles.container}>
			{/* 시즌 팝업 */}
			<SeasonPopup
				visible={showSeasonPopup}
				onClose={() => setShowSeasonPopup(false)}
				onAction={() => {
					setShowSeasonPopup(false);
					navigation.navigate("Track1YouthTax");
				}}
			/>

			<ScrollView showsVerticalScrollIndicator={false}>
				{/* 상단 헤더 */}
				<View style={styles.header}>
					<View>
						<Text style={styles.greeting}>안녕하세요, {userName}님</Text>
						<View style={styles.stageBadge}>
							<Ionicons name={currentStage?.icon as any} size={14} color={currentStage?.color} />
							<Text style={[styles.stageBadgeText, { color: currentStage?.color }]}>
								{currentStage?.label} · {userAge}세
							</Text>
						</View>
					</View>
					<TouchableOpacity style={styles.notifButton}>
						<Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
					</TouchableOpacity>
				</View>

				{/* 배너 슬라이더 */}
				<View style={styles.bannerSection}>
					<FlatList
						data={HOME_BANNERS}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						onMomentumScrollEnd={(e) => {
							const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - SPACING.xl * 2));
							setActiveBanner(idx);
						}}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[styles.bannerCard, { backgroundColor: item.bgColor }]}
								onPress={() => item.route && navigation.navigate(item.route)}
								activeOpacity={0.8}
							>
								{item.type === "season" && (
									<View style={styles.bannerBadge}>
										<Text style={styles.bannerBadgeText}>시즌 서비스 · D-{item.dDay}</Text>
									</View>
								)}
								{item.type === "always" && (
									<View style={[styles.bannerBadge, { backgroundColor: COLORS.blue100 }]}>
										<Text style={[styles.bannerBadgeText, { color: COLORS.blue600 }]}>
											상시 서비스
										</Text>
									</View>
								)}
								<Text style={[styles.bannerTitle, { color: item.color }]}>{item.title}</Text>
								<Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
								<View style={styles.bannerArrow}>
									<Ionicons name="arrow-forward-circle" size={28} color={item.color} />
								</View>
							</TouchableOpacity>
						)}
					/>
					{/* 인디케이터 */}
					<View style={styles.indicators}>
						{HOME_BANNERS.map((_, i) => (
							<View key={i} style={[styles.dot, i === activeBanner && styles.dotActive]} />
						))}
					</View>
				</View>

				{/* 생애주기 빠른 접근 */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>생애주기 서비스</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{LIFECYCLE_STAGES.map((stage) => (
							<TouchableOpacity
								key={stage.key}
								style={[
									styles.lifecycleCard,
									stage.key === lifecycleStage && {
										borderColor: stage.color,
										borderWidth: 2,
									},
								]}
								onPress={() =>
									navigation.navigate("LifecycleDetail", {
										stage: stage.key,
										title: stage.label,
									})
								}
							>
								<View style={[styles.lifecycleIcon, { backgroundColor: stage.bgColor }]}>
									<Ionicons name={stage.icon as any} size={24} color={stage.color} />
								</View>
								<Text style={styles.lifecycleLabel}>{stage.label}</Text>
								<Text style={styles.lifecycleAge}>{stage.ageRange}</Text>
								{stage.key === lifecycleStage && (
									<View style={[styles.myBadge, { backgroundColor: stage.color }]}>
										<Text style={styles.myBadgeText}>나의 단계</Text>
									</View>
								)}
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* 맞춤 가이드 */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>맞춤 가이드</Text>
					<Text style={styles.sectionSubtitle}>{userName}님의 연령대에 맞는 서비스입니다</Text>
					{guides.map((g, idx) => (
						<TouchableOpacity
							key={idx}
							style={styles.guideCard}
							onPress={() => {
								if (g.route === "Lifecycle") {
									// 탭 네비게이션으로 이동
								} else {
									navigation.navigate(g.route);
								}
							}}
						>
							<View style={[styles.guideIcon, { backgroundColor: g.bg }]}>
								<Ionicons name={g.icon as any} size={24} color={g.color} />
							</View>
							<View style={styles.guideTextWrap}>
								<Text style={styles.guideTitle}>{g.title}</Text>
								<Text style={styles.guideDesc}>{g.desc}</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
						</TouchableOpacity>
					))}
				</View>

				{/* 면책 고지 */}
				<View style={[styles.section, { paddingBottom: 40 }]}>
					<DisclaimerBanner text={DISCLAIMER_TEXTS.general} />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const BANNER_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
	},
	greeting: { fontSize: 20, fontWeight: "700", color: COLORS.gray900, marginBottom: SPACING.xs },
	stageBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	stageBadgeText: { fontSize: 13, fontWeight: "600" },
	notifButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: COLORS.white,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},

	bannerSection: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
	bannerCard: {
		width: BANNER_WIDTH,
		borderRadius: RADIUS.xl,
		padding: SPACING.xl,
		paddingBottom: SPACING.xxl,
		minHeight: 160,
	},
	bannerBadge: {
		alignSelf: "flex-start",
		backgroundColor: COLORS.teal100,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.md,
	},
	bannerBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.teal700 },
	bannerTitle: {
		fontSize: 20,
		fontWeight: "700",
		lineHeight: 28,
		marginBottom: SPACING.sm,
	},
	bannerSubtitle: { fontSize: 13, color: COLORS.gray600 },
	bannerArrow: { position: "absolute", bottom: SPACING.xl, right: SPACING.xl },
	indicators: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 6,
		marginTop: SPACING.md,
	},
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray300 },
	dotActive: { width: 20, backgroundColor: COLORS.teal600 },

	section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxl },
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.sm,
	},
	sectionSubtitle: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.lg },

	lifecycleCard: {
		width: 120,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginRight: SPACING.md,
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	lifecycleIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.sm,
	},
	lifecycleLabel: { fontSize: 15, fontWeight: "700", color: COLORS.gray800, marginBottom: 2 },
	lifecycleAge: { fontSize: 12, color: COLORS.gray400 },
	myBadge: {
		marginTop: SPACING.sm,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	myBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.white },

	guideCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	guideIcon: {
		width: 48,
		height: 48,
		borderRadius: RADIUS.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: SPACING.md,
	},
	guideTextWrap: { flex: 1 },
	guideTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray800, marginBottom: 2 },
	guideDesc: { fontSize: 13, color: COLORS.gray500 },
});

export default HomeScreen;
