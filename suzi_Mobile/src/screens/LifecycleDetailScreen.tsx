import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { LIFECYCLE_STAGES, LIFECYCLE_SERVICES } from "../constants";
import { LifecycleStage } from "../types";

const LifecycleDetailScreen = () => {
	const navigation = useNavigation<any>();
	const route = useRoute<any>();
	const stageKey: LifecycleStage = route.params?.stage || "FORMATION";
	const stageInfo = LIFECYCLE_STAGES.find((s) => s.key === stageKey)!;
	const services = LIFECYCLE_SERVICES.filter((s) => s.stage === stageKey);
	const [subscribedIds, setSubscribedIds] = useState<string[]>([]);
	const [email, setEmail] = useState("");

	const handleSubscribe = (serviceId: string) => {
		if (subscribedIds.includes(serviceId)) {
			setSubscribedIds(subscribedIds.filter((id) => id !== serviceId));
		} else {
			setSubscribedIds([...subscribedIds, serviceId]);
		}
	};

	const handleSubmitAll = () => {
		Alert.alert(
			"사전 알림 신청 완료",
			`${subscribedIds.length}개 서비스의 사전 알림이 신청되었습니다.\n서비스 오픈 시 알려드리겠습니다.`,
			[{ text: "확인" }],
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* 상단 바 */}
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<Text style={styles.topBarTitle}>{stageInfo.label}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 히어로 */}
				<View style={[styles.hero, { backgroundColor: stageInfo.bgColor }]}>
					<View style={[styles.heroIcon, { backgroundColor: stageInfo.color + "20" }]}>
						<Ionicons name={stageInfo.icon as any} size={36} color={stageInfo.color} />
					</View>
					<Text style={styles.heroTitle}>{stageInfo.label}</Text>
					<Text style={styles.heroAge}>{stageInfo.ageRange}</Text>
					<Text style={styles.heroDesc}>{stageInfo.description}</Text>
				</View>

				{/* 서비스 목록 */}
				<View style={styles.servicesSection}>
					<Text style={styles.sectionTitle}>준비 중인 서비스</Text>
					<Text style={styles.sectionSubtitle}>아래 서비스들은 MVP 이후 순차적으로 오픈됩니다</Text>

					{services.map((srv) => (
						<View key={srv.id} style={styles.serviceCard}>
							<View style={styles.serviceCardHeader}>
								<View style={[styles.serviceIcon, { backgroundColor: stageInfo.bgColor }]}>
									<Ionicons name={srv.icon as any} size={24} color={stageInfo.color} />
								</View>
								<View style={styles.serviceTextWrap}>
									<Text style={styles.serviceTitle}>{srv.title}</Text>
									<Text style={styles.serviceDesc}>{srv.description}</Text>
								</View>
							</View>

							<View style={styles.comingSoonTag}>
								<Ionicons name="time-outline" size={14} color={COLORS.gray400} />
								<Text style={styles.comingSoonText}>서비스 준비 중</Text>
							</View>

							<TouchableOpacity
								style={[
									styles.subscribeButton,
									subscribedIds.includes(srv.id) && {
										backgroundColor: stageInfo.color,
										borderColor: stageInfo.color,
									},
								]}
								onPress={() => handleSubscribe(srv.id)}
							>
								<Ionicons
									name={subscribedIds.includes(srv.id) ? "checkmark-circle" : "notifications-outline"}
									size={18}
									color={subscribedIds.includes(srv.id) ? COLORS.white : stageInfo.color}
								/>
								<Text
									style={[
										styles.subscribeText,
										subscribedIds.includes(srv.id)
											? { color: COLORS.white }
											: { color: stageInfo.color },
									]}
								>
									{subscribedIds.includes(srv.id) ? "알림 신청 완료" : "사전 알림 신청"}
								</Text>
							</TouchableOpacity>
						</View>
					))}
				</View>

				{/* 이메일 알림 */}
				{subscribedIds.length > 0 && (
					<View style={styles.emailSection}>
						<Text style={styles.emailTitle}>이메일로도 알림을 받으시겠어요?</Text>
						<TextInput
							style={styles.emailInput}
							placeholder="example@email.com"
							placeholderTextColor={COLORS.gray400}
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
						<TouchableOpacity
							style={[styles.submitButton, { backgroundColor: stageInfo.color }]}
							onPress={handleSubmitAll}
						>
							<Text style={styles.submitButtonText}>알림 신청 완료</Text>
						</TouchableOpacity>
					</View>
				)}

				<View style={{ height: 40 }} />
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

	hero: { padding: SPACING.xxl, alignItems: "center", marginBottom: SPACING.xxl },
	heroIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.lg,
	},
	heroTitle: { fontSize: 24, fontWeight: "700", color: COLORS.gray900, marginBottom: SPACING.xs },
	heroAge: { fontSize: 15, fontWeight: "600", color: COLORS.gray500, marginBottom: SPACING.md },
	heroDesc: { fontSize: 14, color: COLORS.gray600, textAlign: "center", lineHeight: 20 },

	servicesSection: { paddingHorizontal: SPACING.xl },
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	sectionSubtitle: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.lg },

	serviceCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.xl,
		padding: SPACING.xl,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	serviceCardHeader: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md },
	serviceIcon: {
		width: 48,
		height: 48,
		borderRadius: RADIUS.md,
		justifyContent: "center",
		alignItems: "center",
	},
	serviceTextWrap: { flex: 1 },
	serviceTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray800, marginBottom: 4 },
	serviceDesc: { fontSize: 13, color: COLORS.gray500, lineHeight: 18 },
	comingSoonTag: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: COLORS.gray50,
		alignSelf: "flex-start",
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.md,
	},
	comingSoonText: { fontSize: 12, color: COLORS.gray400, fontWeight: "600" },

	subscribeButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingVertical: SPACING.md,
	},
	subscribeText: { fontSize: 14, fontWeight: "600" },

	emailSection: { paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
	emailTitle: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.gray800,
		marginBottom: SPACING.md,
	},
	emailInput: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md + 2,
		fontSize: 15,
		color: COLORS.gray900,
		backgroundColor: COLORS.gray50,
		marginBottom: SPACING.md,
	},
	submitButton: {
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		alignItems: "center",
	},
	submitButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
});

export default LifecycleDetailScreen;
