import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { LIFECYCLE_STAGES, LIFECYCLE_SERVICES } from "../constants";
import { LifecycleStage } from "../types";
import { useAIChatScreen } from "../hooks/useAIChatScreen";

const LifecycleScreen = () => {
	const navigation = useNavigation<any>();
	useAIChatScreen("lifecycle");
	const [selectedStage, setSelectedStage] = useState<LifecycleStage | null>(null);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* 헤더 */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>생애주기 서비스</Text>
					<Text style={styles.headerSubtitle}>생애 단계별 맞춤 금융·세무 서비스는 출시 예정입니다</Text>
				</View>

				{/* 단계 선택 */}
				<View style={styles.stageSelector}>
					{LIFECYCLE_STAGES.map((stage) => (
						<TouchableOpacity
							key={stage.key}
							style={[
								styles.stageTab,
								selectedStage === stage.key && {
									backgroundColor: stage.color,
									borderColor: stage.color,
								},
							]}
							onPress={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
						>
							<Ionicons
								name={stage.icon as any}
								size={18}
								color={selectedStage === stage.key ? COLORS.white : stage.color}
							/>
							<Text style={[styles.stageTabText, selectedStage === stage.key && { color: COLORS.white }]}>
								{stage.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* 전체 또는 선택된 단계 */}
				{LIFECYCLE_STAGES.filter((s) => !selectedStage || s.key === selectedStage).map((stage) => {
					const services = LIFECYCLE_SERVICES.filter((srv) => srv.stage === stage.key);
					return (
						<View key={stage.key} style={styles.stageSection}>
							{/* 단계 헤더 */}
							<TouchableOpacity
								style={[styles.stageHeader, { backgroundColor: stage.bgColor }]}
								onPress={() =>
									navigation.navigate("LifecycleDetail", {
										stage: stage.key,
										title: stage.label,
									})
								}
							>
								<View style={styles.stageHeaderLeft}>
									<View style={[styles.stageIconCircle, { backgroundColor: stage.color + "20" }]}>
										<Ionicons name={stage.icon as any} size={24} color={stage.color} />
									</View>
									<View>
										<Text style={styles.stageHeaderTitle}>{stage.label}</Text>
										<Text style={styles.stageHeaderAge}>{stage.ageRange}</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={20} color={stage.color} />
							</TouchableOpacity>

							{/* 서비스 목록 */}
							{services.map((srv) => (
								<View key={srv.id} style={styles.serviceCard}>
									<View style={styles.serviceCardLeft}>
										<View style={[styles.serviceIcon, { backgroundColor: stage.bgColor }]}>
											<Ionicons name={srv.icon as any} size={22} color={stage.color} />
										</View>
										<View style={styles.serviceTextWrap}>
											<Text style={styles.serviceTitle}>{srv.title}</Text>
											<Text style={styles.serviceDesc}>{srv.description}</Text>
										</View>
									</View>
									<TouchableOpacity
										style={[styles.notifyButton, { borderColor: stage.color + "40" }]}
									>
										<Ionicons name="notifications-outline" size={14} color={stage.color} />
										<Text style={[styles.notifyText, { color: stage.color }]}>알림 신청</Text>
									</TouchableOpacity>
								</View>
							))}
						</View>
					);
				})}

				{/* 하단 안내 */}
				<View style={styles.bottomInfo}>
					<Ionicons name="information-circle-outline" size={20} color={COLORS.gray400} />
					<Text style={styles.bottomInfoText}>
						생애주기 서비스는 순차적으로 제공될 예정입니다.{"\n"}
						알림 신청 시 출시 소식을 알려드립니다.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	headerSubtitle: { fontSize: 14, color: COLORS.gray500, lineHeight: 20 },

	stageSelector: {
		flexDirection: "row",
		paddingHorizontal: SPACING.xl,
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
	},
	stageTab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.white,
	},
	stageTabText: { fontSize: 13, fontWeight: "700", color: COLORS.gray600 },

	stageSection: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxl },
	stageHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: SPACING.lg,
		borderRadius: RADIUS.xl,
		marginBottom: SPACING.md,
	},
	stageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
	stageIconCircle: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
	},
	stageHeaderTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
	stageHeaderAge: { fontSize: 13, color: COLORS.gray500 },

	serviceCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	serviceCardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: SPACING.md },
	serviceIcon: {
		width: 44,
		height: 44,
		borderRadius: RADIUS.md,
		justifyContent: "center",
		alignItems: "center",
	},
	serviceTextWrap: { flex: 1 },
	serviceTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray800, marginBottom: 2 },
	serviceDesc: { fontSize: 12, color: COLORS.gray500, lineHeight: 16 },

	notifyButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		borderWidth: 1,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs + 2,
		borderRadius: RADIUS.full,
		marginLeft: SPACING.sm,
	},
	notifyText: { fontSize: 11, fontWeight: "600" },

	bottomInfo: {
		flexDirection: "row",
		gap: SPACING.sm,
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.xl,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	bottomInfoText: { flex: 1, fontSize: 12, color: COLORS.gray400, lineHeight: 18 },
});

export default LifecycleScreen;
