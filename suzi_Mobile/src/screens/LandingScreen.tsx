import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LandingScreen = () => {
	const navigation = useNavigation<any>();

	const features = [
		{
			icon: "receipt-outline",
			title: "청년 소득세 감면",
			desc: "경정청구 시뮬레이션으로\n환급 가능 금액 확인",
			color: COLORS.teal600,
			bg: COLORS.teal50,
		},
		{
			icon: "analytics-outline",
			title: "6Way 세금 비교",
			desc: "2주택자 양도/증여\n6가지 시나리오 비교",
			color: COLORS.blue600,
			bg: COLORS.blue50,
		},
		{
			icon: "leaf-outline",
			title: "생애주기 서비스",
			desc: "형성기·운용기·이전기\n맞춤 금융 가이드",
			color: COLORS.purple600,
			bg: COLORS.purple50,
		},
	];

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 상단 네비게이션 */}
				<View style={styles.topNav}>
					<Text style={styles.logo}>FINZ</Text>
					<View style={styles.topNavRight}>
						<TouchableOpacity onPress={() => navigation.navigate("Company")}>
							<Text style={styles.navLink}>회사 소개</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => navigation.navigate("B2B")}>
							<Text style={styles.navLink}>B2B 문의</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* 히어로 섹션 */}
				<View style={styles.heroSection}>
					<View style={styles.heroBadge}>
						<Text style={styles.heroBadgeText}>Explainable Financial Guide</Text>
					</View>
					<Text style={styles.heroTitle}>
						복잡한 금융·세무,{"\n"}
						<Text style={styles.heroTitleAccent}>이해하고 결정</Text>하세요
					</Text>
					<Text style={styles.heroSubtitle}>
						결과만 통보하지 않습니다.{"\n"}
						의사결정에 필요한 이유, 구조, 선택 기준을 설명합니다.
					</Text>

					<TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate("Auth")}>
						<Text style={styles.ctaButtonText}>무료로 시작하기</Text>
						<Ionicons name="arrow-forward" size={20} color={COLORS.white} />
					</TouchableOpacity>

					<TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate("Auth")}>
						<Text style={styles.loginButtonText}>이미 계정이 있으신가요? 로그인</Text>
					</TouchableOpacity>
				</View>

				{/* 핵심 서비스 카드 */}
				<View style={styles.featuresSection}>
					<Text style={styles.sectionTitle}>핵심 서비스</Text>
					<Text style={styles.sectionSubtitle}>명확한 문제를 확실히 해결합니다</Text>

					{features.map((f, idx) => (
						<View key={idx} style={styles.featureCard}>
							<View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
								<Ionicons name={f.icon as any} size={28} color={f.color} />
							</View>
							<View style={styles.featureTextWrap}>
								<Text style={styles.featureTitle}>{f.title}</Text>
								<Text style={styles.featureDesc}>{f.desc}</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
						</View>
					))}
				</View>

				{/* 원칙 섹션 */}
				<View style={styles.principleSection}>
					<Text style={styles.sectionTitle}>서비스 원칙</Text>
					{[
						{ icon: "shield-checkmark-outline", text: "비자문·비중개 원칙 준수" },
						{ icon: "eye-outline", text: "설명 가능한 금융 가이드" },
						{ icon: "person-outline", text: "최종 판단은 사용자 본인" },
					].map((p, idx) => (
						<View key={idx} style={styles.principleRow}>
							<Ionicons name={p.icon as any} size={22} color={COLORS.teal600} />
							<Text style={styles.principleText}>{p.text}</Text>
						</View>
					))}
				</View>

				{/* 푸터 */}
				<View style={styles.footer}>
					<Text style={styles.footerLogo}>(주)FINZ</Text>
					<Text style={styles.footerText}>
						본 서비스는 정보 제공 목적으로만 제공되며,{"\n"}
						세무·법률·투자 자문이 아닙니다.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	scroll: { paddingBottom: 40 },
	topNav: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
	},
	logo: { fontSize: 20, fontWeight: "700", color: COLORS.teal600 },
	topNavRight: { flexDirection: "row", gap: SPACING.lg },
	navLink: { fontSize: 14, color: COLORS.gray500, fontWeight: "600" },

	heroSection: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.xxxl,
		paddingBottom: SPACING.xxxl,
		alignItems: "center",
	},
	heroBadge: {
		backgroundColor: COLORS.teal50,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.xs + 2,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.lg,
	},
	heroBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.teal600 },
	heroTitle: {
		fontSize: 28,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 40,
		marginBottom: SPACING.md,
	},
	heroTitleAccent: { color: COLORS.teal600 },
	heroSubtitle: {
		fontSize: 15,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: SPACING.xxl,
	},
	ctaButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.teal600,
		paddingHorizontal: SPACING.xxxl,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
	},
	ctaButtonText: { fontSize: 17, fontWeight: "700", color: COLORS.white },
	loginButton: { marginTop: SPACING.lg },
	loginButtonText: { fontSize: 14, color: COLORS.gray400 },

	featuresSection: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxxl },
	sectionTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	sectionSubtitle: { fontSize: 14, color: COLORS.gray500, marginBottom: SPACING.xl },
	featureCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	featureIconWrap: {
		width: 52,
		height: 52,
		borderRadius: RADIUS.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: SPACING.md,
	},
	featureTextWrap: { flex: 1 },
	featureTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray800, marginBottom: 2 },
	featureDesc: { fontSize: 13, color: COLORS.gray500, lineHeight: 18 },

	principleSection: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.xxl,
		backgroundColor: COLORS.gray50,
		marginBottom: SPACING.xxxl,
	},
	principleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		paddingVertical: SPACING.md,
	},
	principleText: { fontSize: 15, color: COLORS.gray700, fontWeight: "600" },

	footer: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.xxl,
		alignItems: "center",
	},
	footerLogo: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray400,
		marginBottom: SPACING.sm,
	},
	footerText: { fontSize: 12, color: COLORS.gray400, textAlign: "center", lineHeight: 18 },
});

export default LandingScreen;
