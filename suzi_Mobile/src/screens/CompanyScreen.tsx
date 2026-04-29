import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";

const CompanyScreen = () => {
	const navigation = useNavigation<any>();

	const team = [
		{
			name: "최부영",
			role: "CEO",
			desc: "프로젝트 총괄, 전략 방향 결정",
			icon: "briefcase-outline",
		},
		{
			name: "허준영",
			role: "CTO",
			desc: "기술 아키텍처, 세무 로직 구현",
			icon: "code-slash-outline",
		},
		{
			name: "왕희원",
			role: "CISO",
			desc: "보안 아키텍처, 프론트엔드 개발",
			icon: "shield-outline",
		},
		{ name: "홍현준", role: "CSO", desc: "사업 전략, 규제 대응", icon: "trending-up-outline" },
		{ name: "주아연", role: "연구소장", desc: "AI 연구, 데이터 분석", icon: "flask-outline" },
	];

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<Text style={styles.topBarTitle}>회사 소개</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 히어로 */}
				<View style={styles.hero}>
					<Text style={styles.heroLogo}>FINZ</Text>
					<Text style={styles.heroTitle}>
						복잡한 금융·세무를{"\n"}
						<Text style={styles.heroAccent}>이해 가능한 언어</Text>로
					</Text>
					<Text style={styles.heroSubtitle}>
						Explainable Financial Guide{"\n"}
						설명 가능한 금융 가이드 플랫폼
					</Text>
				</View>

				{/* 비전 */}
				<View style={styles.visionSection}>
					<Text style={styles.sectionTitle}>우리의 비전</Text>
					{[
						{
							icon: "eye-outline",
							title: "설명 가능한 금융",
							desc: "결과만 통보하지 않고, 과정과 이유를 설명합니다",
						},
						{
							icon: "shield-checkmark-outline",
							title: "비자문 원칙",
							desc: "판단을 대신하지 않고, 의사결정에 필요한 정보를 제공합니다",
						},
						{
							icon: "people-outline",
							title: "생애주기 동반자",
							desc: "개인의 금융 여정 전반에 걸친 맞춤형 가이드",
						},
					].map((v, i) => (
						<View key={i} style={styles.visionCard}>
							<View style={styles.visionIcon}>
								<Ionicons name={v.icon as any} size={24} color={COLORS.teal600} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.visionTitle}>{v.title}</Text>
								<Text style={styles.visionDesc}>{v.desc}</Text>
							</View>
						</View>
					))}
				</View>

				{/* 팀 */}
				<View style={styles.teamSection}>
					<Text style={styles.sectionTitle}>팀 소개</Text>
					{team.map((m, i) => (
						<View key={i} style={styles.teamCard}>
							<View style={styles.teamAvatar}>
								<Ionicons name={m.icon as any} size={22} color={COLORS.teal600} />
							</View>
							<View style={{ flex: 1 }}>
								<View style={styles.teamNameRow}>
									<Text style={styles.teamName}>{m.name}</Text>
									<View style={styles.roleBadge}>
										<Text style={styles.roleBadgeText}>{m.role}</Text>
									</View>
								</View>
								<Text style={styles.teamDesc}>{m.desc}</Text>
							</View>
						</View>
					))}
				</View>

				{/* 푸터 */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>(주)FINZ · 2026</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
	},
	topBarTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
	scroll: { paddingBottom: 40 },

	hero: {
		alignItems: "center",
		paddingVertical: SPACING.xxxl,
		paddingHorizontal: SPACING.xl,
		backgroundColor: COLORS.teal50,
	},
	heroLogo: { fontSize: 16, fontWeight: "700", color: COLORS.teal600, marginBottom: SPACING.lg },
	heroTitle: {
		fontSize: 26,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 36,
		marginBottom: SPACING.md,
	},
	heroAccent: { color: COLORS.teal600 },
	heroSubtitle: { fontSize: 14, color: COLORS.gray500, textAlign: "center", lineHeight: 20 },

	visionSection: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xxl },
	sectionTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.lg,
	},
	visionCard: {
		flexDirection: "row",
		gap: SPACING.md,
		marginBottom: SPACING.lg,
		backgroundColor: COLORS.gray50,
		padding: SPACING.lg,
		borderRadius: RADIUS.lg,
	},
	visionIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
	},
	visionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray800, marginBottom: 4 },
	visionDesc: { fontSize: 13, color: COLORS.gray500, lineHeight: 18 },

	teamSection: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
	teamCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	teamAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
	},
	teamNameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: 4 },
	teamName: { fontSize: 16, fontWeight: "700", color: COLORS.gray800 },
	roleBadge: {
		backgroundColor: COLORS.teal50,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	roleBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.teal600 },
	teamDesc: { fontSize: 13, color: COLORS.gray500 },

	footer: { alignItems: "center", paddingVertical: SPACING.xl },
	footerText: { fontSize: 13, color: COLORS.gray400 },
});

export default CompanyScreen;
