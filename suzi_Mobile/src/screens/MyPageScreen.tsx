import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Switch,
	Alert,
	TextInput,
	Modal,
	Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { LIFECYCLE_STAGES } from "../constants";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import simulationStorage, { SavedSimulationEntry } from "../services/simulationStorage";
import { useAIChatScreen } from "../hooks/useAIChatScreen";

type Tab = "profile" | "simulations" | "notifications" | "settings";

const MyPageScreen = () => {
	const navigation = useNavigation<any>();
	const { user, logout, updateProfile } = useAuth();
	useAIChatScreen("mypage");

	const [activeTab, setActiveTab] = useState<Tab>("profile");
	const [pushEnabled, setPushEnabled] = useState(true);
	const [seasonNotif, setSeasonNotif] = useState(true);
	const [lifecycleNotif, setLifecycleNotif] = useState(true);

	// 시뮬레이션 저장 목록
	const [savedSimulations, setSavedSimulations] = useState<SavedSimulationEntry[]>([]);

	// 이름 수정
	const [isEditingName, setIsEditingName] = useState(false);
	const [editName, setEditName] = useState(user?.name ?? "");

	const tabs: { key: Tab; label: string; icon: string }[] = [
		{ key: "profile", label: "프로필", icon: "person-outline" },
		{ key: "simulations", label: "시뮬레이션", icon: "bookmark-outline" },
		{ key: "notifications", label: "알림", icon: "notifications-outline" },
		{ key: "settings", label: "설정", icon: "settings-outline" },
	];

	// 시뮬레이션 목록 로드
	const loadSimulations = useCallback(async () => {
		if (!user?.id) return;
		const list = await simulationStorage.getAll(user.id);
		setSavedSimulations(list);
	}, [user?.id]);

	useEffect(() => {
		loadSimulations();
	}, [loadSimulations]);

	// 탭 전환 시 시뮬레이션 새로고침
	useEffect(() => {
		if (activeTab === "simulations") loadSimulations();
	}, [activeTab, loadSimulations]);

	// 시뮬레이션 삭제
	const handleDeleteSimulation = useCallback(
		async (id: string) => {
			Alert.alert("삭제", "시뮬레이션을 삭제하시겠습니까?", [
				{ text: "취소", style: "cancel" },
				{
					text: "삭제",
					style: "destructive",
					onPress: async () => {
						if (!user?.id) return;
						await simulationStorage.remove(user.id, id);
						await loadSimulations();
					},
				},
			]);
		},
		[loadSimulations],
	);

	// 로그아웃
	const handleLogout = useCallback(() => {
		Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
			{ text: "취소", style: "cancel" },
			{
				text: "로그아웃",
				style: "destructive",
				// AuthContext.logout()이 user를 null로 설정 → isSignedIn=false → AppNavigator가 자동으로 Landing 표시
				onPress: async () => {
					try {
						await logout();
					} catch (err: any) {
						Alert.alert(
							"로그아웃 실패 (Logout Failed)",
							err.message || "서버 통신 중 문제가 발생했습니다. 네트워크 연결을 확인해주세요.",
						);
					}
				},
			},
		]);
	}, [logout]);

	// 이름 저장
	const handleSaveName = useCallback(async () => {
		if (!editName.trim()) return;
		try {
			await updateProfile({ name: editName.trim() });
			setIsEditingName(false);
		} catch (err: any) {
			Alert.alert(
				"이름 변경 실패 (Profile Update Failed)",
				err.message || "서버에 프로필 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
			);
		}
	}, [editName, updateProfile]);

	// 계정 관리 모달
	const [showAccountModal, setShowAccountModal] = useState(false);
	const [isEditingPhone, setIsEditingPhone] = useState(false);
	const [editPhone, setEditPhone] = useState(user?.phone ?? "");

	// 앱 정보 모달
	const [showAppInfoModal, setShowAppInfoModal] = useState(false);

	// 전화번호 저장
	const handleSavePhone = useCallback(async () => {
		try {
			await updateProfile({ phone: editPhone.trim() || undefined });
			setIsEditingPhone(false);
		} catch (err: any) {
			Alert.alert(
				"전화번호 변경 실패 (Phone Update Failed)",
				err.message || "전화번호를 저장하지 못했습니다. 올바른 형식인지 확인 후 다시 시도해주세요.",
			);
		}
	}, [editPhone, updateProfile]);

	// 계정 삭제
	const handleDeleteAccount = useCallback(() => {
		Alert.alert(
			"계정 삭제",
			"정말로 계정을 삭제하시겠습니까?\n삭제된 계정은 복구할 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.",
			[
				{ text: "취소", style: "cancel" },
				{
					text: "삭제",
					style: "destructive",
					onPress: () => {
						Alert.alert("최종 확인", "계정 삭제를 진행합니다.", [
							{ text: "취소", style: "cancel" },
							{
								text: "영구 삭제",
								style: "destructive",
								onPress: async () => {
									// deleteAccount()이 토큰 삭제 → AuthContext 상태 변경 → 자동 Landing 전환
									try {
										await authService.deleteAccount();
										setShowAccountModal(false);
										await logout();
									} catch (err: any) {
										Alert.alert(
											"계정 삭제 실패 (Account Deletion Failed)",
											err.message ||
												"서버에서 계정을 삭제하지 못했습니다. 네트워크 연결을 확인 후 다시 시도해주세요.",
										);
									}
								},
							},
						]);
					},
				},
			],
		);
	}, [logout]);

	// 고객센터
	const handleCustomerSupport = useCallback(() => {
		Linking.openURL("mailto:support@finz.co.kr?subject=FINZ 문의");
	}, []);

	// 설정 메뉴 항목 onPress
	const settingsMenuHandlers: Record<string, () => void> = {
		"계정 관리": () => {
			setEditPhone(user?.phone ?? "");
			setShowAccountModal(true);
		},
		이용약관: () => Linking.openURL("https://finz.co.kr/terms"),
		"개인정보 처리방침": () => Linking.openURL("https://finz.co.kr/privacy"),
		고객센터: handleCustomerSupport,
		"앱 정보": () => setShowAppInfoModal(true),
	};

	// 사용자 정보 파생
	const displayName = user?.name ?? "사용자";
	const displayEmail = user?.email ?? "";
	const currentStage = LIFECYCLE_STAGES[user?.stage_index ?? 1];
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
		: null;

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* 헤더 */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>마이페이지</Text>
				</View>

				{/* 프로필 카드 */}
				<View style={styles.profileCard}>
					<View style={styles.avatarCircle}>
						<Ionicons name="person" size={32} color={COLORS.teal600} />
					</View>
					<View style={styles.profileInfo}>
						{isEditingName ? (
							<View style={styles.nameEditRow}>
								<TextInput
									style={styles.nameInput}
									value={editName}
									onChangeText={setEditName}
									autoFocus
									returnKeyType="done"
									onSubmitEditing={handleSaveName}
								/>
								<TouchableOpacity onPress={handleSaveName}>
									<Ionicons name="checkmark-circle" size={24} color={COLORS.teal600} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => {
										setIsEditingName(false);
										setEditName(displayName);
									}}
								>
									<Ionicons name="close-circle" size={24} color={COLORS.gray400} />
								</TouchableOpacity>
							</View>
						) : (
							<TouchableOpacity
								style={styles.nameEditRow}
								onPress={() => {
									setEditName(displayName);
									setIsEditingName(true);
								}}
							>
								<Text style={styles.profileName}>{displayName}</Text>
								<Ionicons name="create-outline" size={16} color={COLORS.gray400} />
							</TouchableOpacity>
						)}
						<Text style={styles.profileEmail}>{displayEmail}</Text>
						<View style={styles.profileBadgeRow}>
							{currentStage && (
								<View style={[styles.profileBadge, { backgroundColor: COLORS.blue50 }]}>
									<Ionicons name="trending-up-outline" size={12} color={COLORS.blue600} />
									<Text style={[styles.profileBadgeText, { color: COLORS.blue600 }]}>
										{currentStage.label}
										{userAge ? ` · ${userAge}세` : ""}
									</Text>
								</View>
							)}
						</View>
					</View>
				</View>

				{/* 탭 바 */}
				<View style={styles.tabBar}>
					{tabs.map((tab) => (
						<TouchableOpacity
							key={tab.key}
							style={[styles.tab, activeTab === tab.key && styles.tabActive]}
							onPress={() => setActiveTab(tab.key)}
						>
							<Ionicons
								name={tab.icon as any}
								size={18}
								color={activeTab === tab.key ? COLORS.teal600 : COLORS.gray400}
							/>
							<Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
								{tab.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* -- 프로필 탭 -- */}
				{activeTab === "profile" && (
					<View style={styles.tabContent}>
						{/* 관심 생애주기 */}
						<Text style={styles.sectionTitle}>관심 생애주기</Text>
						<Text style={styles.sectionSubtitle}>관심 있는 단계를 선택하면 맞춤 콘텐츠를 제공합니다</Text>
						{LIFECYCLE_STAGES.map((stage) => (
							<TouchableOpacity
								key={stage.key}
								style={styles.lifecycleRow}
								onPress={() =>
									navigation.navigate("LifecycleDetail", {
										stage: stage.key,
										title: stage.label,
									})
								}
							>
								<View style={[styles.lifecycleRowIcon, { backgroundColor: stage.bgColor }]}>
									<Ionicons name={stage.icon as any} size={20} color={stage.color} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.lifecycleRowTitle}>{stage.label}</Text>
									<Text style={styles.lifecycleRowAge}>{stage.ageRange}</Text>
								</View>
								<Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
							</TouchableOpacity>
						))}

						{/* 프리미엄 */}
						<View style={styles.premiumCard}>
							<Ionicons name="diamond-outline" size={28} color={COLORS.purple600} />
							<View style={{ flex: 1, marginLeft: SPACING.md }}>
								<Text style={styles.premiumTitle}>프리미엄 서비스</Text>
								<Text style={styles.premiumDesc}>세무사 상담, 맞춤 컨설팅</Text>
							</View>
							<View style={styles.comingSoonBadge}>
								<Text style={styles.comingSoonText}>출시 예정</Text>
							</View>
						</View>
					</View>
				)}

				{/* -- 시뮬레이션 탭 -- */}
				{activeTab === "simulations" && (
					<View style={styles.tabContent}>
						<Text style={styles.sectionTitle}>내 시뮬레이션</Text>
						<Text style={styles.sectionSubtitle}>저장된 시뮬레이션 결과를 확인하세요</Text>

						{savedSimulations.length === 0 ? (
							<View style={styles.emptyState}>
								<Ionicons name="folder-open-outline" size={48} color={COLORS.gray300} />
								<Text style={styles.emptyText}>저장된 시뮬레이션이 없습니다</Text>
							</View>
						) : (
							savedSimulations.map((sim) => (
								<TouchableOpacity key={sim.id} style={styles.simCard}>
									<View style={styles.simCardTop}>
										<View
											style={[
												styles.simTypeBadge,
												sim.type === "youth_tax"
													? { backgroundColor: COLORS.teal50 }
													: { backgroundColor: COLORS.blue50 },
											]}
										>
											<Ionicons
												name={sim.type === "youth_tax" ? "receipt-outline" : "home-outline"}
												size={14}
												color={sim.type === "youth_tax" ? COLORS.teal600 : COLORS.blue600}
											/>
											<Text
												style={[
													styles.simTypeBadgeText,
													{
														color:
															sim.type === "youth_tax" ? COLORS.teal600 : COLORS.blue600,
													},
												]}
											>
												{sim.type === "youth_tax" ? "청년 감면" : "보유 형태"}
											</Text>
										</View>
										<TouchableOpacity onPress={() => handleDeleteSimulation(sim.id)}>
											<Ionicons name="trash-outline" size={18} color={COLORS.gray400} />
										</TouchableOpacity>
									</View>
									<Text style={styles.simTitle}>{sim.title}</Text>
									<Text style={styles.simSummary}>{sim.summary}</Text>
									<Text style={styles.simDate}>{sim.createdAt}</Text>
								</TouchableOpacity>
							))
						)}
					</View>
				)}

				{/* -- 알림 탭 -- */}
				{activeTab === "notifications" && (
					<View style={styles.tabContent}>
						<Text style={styles.sectionTitle}>알림 관리</Text>

						<View style={styles.settingRow}>
							<View style={styles.settingRowLeft}>
								<Ionicons name="notifications-outline" size={22} color={COLORS.gray700} />
								<View>
									<Text style={styles.settingLabel}>푸시 알림</Text>
									<Text style={styles.settingDesc}>앱 푸시 알림 수신</Text>
								</View>
							</View>
							<Switch
								value={pushEnabled}
								onValueChange={setPushEnabled}
								trackColor={{ false: COLORS.gray200, true: COLORS.teal500 }}
								thumbColor={COLORS.white}
							/>
						</View>

						<View style={styles.settingRow}>
							<View style={styles.settingRowLeft}>
								<Ionicons name="calendar-outline" size={22} color={COLORS.gray700} />
								<View>
									<Text style={styles.settingLabel}>시즌 서비스 알림</Text>
									<Text style={styles.settingDesc}>종합소득세 신고 등 시즌 서비스 안내</Text>
								</View>
							</View>
							<Switch
								value={seasonNotif}
								onValueChange={setSeasonNotif}
								trackColor={{ false: COLORS.gray200, true: COLORS.teal500 }}
								thumbColor={COLORS.white}
							/>
						</View>

						<View style={styles.settingRow}>
							<View style={styles.settingRowLeft}>
								<Ionicons name="leaf-outline" size={22} color={COLORS.gray700} />
								<View>
									<Text style={styles.settingLabel}>생애주기 알림</Text>
									<Text style={styles.settingDesc}>사전 신청한 서비스 오픈 알림</Text>
								</View>
							</View>
							<Switch
								value={lifecycleNotif}
								onValueChange={setLifecycleNotif}
								trackColor={{ false: COLORS.gray200, true: COLORS.teal500 }}
								thumbColor={COLORS.white}
							/>
						</View>
					</View>
				)}

				{/* -- 설정 탭 -- */}
				{activeTab === "settings" && (
					<View style={styles.tabContent}>
						<Text style={styles.sectionTitle}>설정</Text>

						{[
							{
								icon: "person-outline",
								label: "계정 관리",
								sub: "프로필 관리, 계정 삭제",
							},
							{
								icon: "document-text-outline",
								label: "이용약관",
								sub: "서비스 이용약관 확인",
							},
							{ icon: "shield-outline", label: "개인정보 처리방침", sub: "" },
							{
								icon: "help-circle-outline",
								label: "고객센터",
								sub: "문의 및 도움말",
							},
							{ icon: "information-circle-outline", label: "앱 정보", sub: "v1.0.0" },
						].map((item, idx) => (
							<TouchableOpacity
								key={idx}
								style={styles.menuRow}
								onPress={settingsMenuHandlers[item.label]}
							>
								<View style={styles.menuRowLeft}>
									<Ionicons name={item.icon as any} size={22} color={COLORS.gray600} />
									<View>
										<Text style={styles.menuLabel}>{item.label}</Text>
										{item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
									</View>
								</View>
								<Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
							</TouchableOpacity>
						))}

						<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
							<Ionicons name="log-out-outline" size={20} color={COLORS.red500} />
							<Text style={styles.logoutText}>로그아웃</Text>
						</TouchableOpacity>
					</View>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* 계정 관리 모달 */}
			<Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet">
				<SafeAreaView style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>계정 관리</Text>
						<TouchableOpacity
							onPress={() => {
								setShowAccountModal(false);
								setIsEditingPhone(false);
							}}
						>
							<Ionicons name="close" size={24} color={COLORS.gray700} />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.modalBody}>
						{/* 이메일 (읽기 전용) */}
						<Text style={styles.modalSectionTitle}>이메일</Text>
						<View style={styles.modalInfoRow}>
							<Ionicons name="mail-outline" size={20} color={COLORS.gray500} />
							<Text style={styles.modalInfoText}>{displayEmail}</Text>
						</View>

						{/* 이름 */}
						<Text style={styles.modalSectionTitle}>이름</Text>
						<View style={styles.modalInfoRow}>
							<Ionicons name="person-outline" size={20} color={COLORS.gray500} />
							<Text style={styles.modalInfoText}>{displayName}</Text>
							<TouchableOpacity
								onPress={() => {
									setShowAccountModal(false);
									setEditName(displayName);
									setIsEditingName(true);
								}}
							>
								<Text style={styles.modalEditLink}>변경</Text>
							</TouchableOpacity>
						</View>

						{/* 전화번호 */}
						<Text style={styles.modalSectionTitle}>전화번호</Text>
						{isEditingPhone ? (
							<View style={styles.modalEditFieldRow}>
								<TextInput
									style={styles.modalTextInput}
									value={editPhone}
									onChangeText={setEditPhone}
									placeholder="010-0000-0000"
									keyboardType="phone-pad"
									autoFocus
								/>
								<TouchableOpacity onPress={handleSavePhone} style={styles.modalSmallBtn}>
									<Text style={styles.modalSmallBtnText}>저장</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => setIsEditingPhone(false)}
									style={[styles.modalSmallBtn, { backgroundColor: COLORS.gray200 }]}
								>
									<Text style={[styles.modalSmallBtnText, { color: COLORS.gray600 }]}>취소</Text>
								</TouchableOpacity>
							</View>
						) : (
							<View style={styles.modalInfoRow}>
								<Ionicons name="call-outline" size={20} color={COLORS.gray500} />
								<Text style={styles.modalInfoText}>{user?.phone || "미등록"}</Text>
								<TouchableOpacity
									onPress={() => {
										setEditPhone(user?.phone ?? "");
										setIsEditingPhone(true);
									}}
								>
									<Text style={styles.modalEditLink}>{user?.phone ? "변경" : "등록"}</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* 가입일 */}
						<Text style={styles.modalSectionTitle}>가입일</Text>
						<View style={styles.modalInfoRow}>
							<Ionicons name="calendar-outline" size={20} color={COLORS.gray500} />
							<Text style={styles.modalInfoText}>
								{user?.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR") : "-"}
							</Text>
						</View>

						{/* 계정 삭제 */}
						<View style={styles.modalDangerSection}>
							<Text style={styles.modalDangerTitle}>계정 삭제</Text>
							<Text style={styles.modalDangerDesc}>
								계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
							</Text>
							<TouchableOpacity style={styles.modalDangerBtn} onPress={handleDeleteAccount}>
								<Ionicons name="trash-outline" size={18} color={COLORS.red500} />
								<Text style={styles.modalDangerBtnText}>계정 삭제</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</SafeAreaView>
			</Modal>

			{/* 앱 정보 모달 */}
			<Modal visible={showAppInfoModal} animationType="fade" transparent>
				<View style={styles.appInfoOverlay}>
					<View style={styles.appInfoCard}>
						<View style={styles.appInfoIconWrap}>
							<Ionicons name="home" size={36} color={COLORS.teal600} />
						</View>
						<Text style={styles.appInfoName}>FINZ</Text>
						<Text style={styles.appInfoVersion}>v1.0.0</Text>
						<View style={styles.appInfoDivider} />
						<Text style={styles.appInfoDesc}>
							청년 소득세 환급 및{"\n"}
							부동산 세금 비교 시뮬레이션 서비스
						</Text>
						<Text style={styles.appInfoCopyright}>© 2026 FINZ. All rights reserved.</Text>
						<TouchableOpacity style={styles.appInfoCloseBtn} onPress={() => setShowAppInfoModal(false)}>
							<Text style={styles.appInfoCloseBtnText}>확인</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
	headerTitle: { fontSize: 24, fontWeight: "700", color: COLORS.gray900 },

	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.lg,
		marginHorizontal: SPACING.xl,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.xl,
		padding: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		marginBottom: SPACING.lg,
	},
	avatarCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
	},
	profileInfo: { flex: 1 },
	profileName: { fontSize: 18, fontWeight: "700", color: COLORS.gray900, marginBottom: 2 },
	profileEmail: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.sm },
	profileBadgeRow: { flexDirection: "row" },
	profileBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	profileBadgeText: { fontSize: 12, fontWeight: "600" },

	nameEditRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: 2 },
	nameInput: {
		flex: 1,
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.teal600,
		paddingVertical: 2,
	},

	tabBar: {
		flexDirection: "row",
		marginHorizontal: SPACING.xl,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: 3,
		marginBottom: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	tab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.md,
	},
	tabActive: { backgroundColor: COLORS.teal50 },
	tabText: { fontSize: 12, fontWeight: "600", color: COLORS.gray400 },
	tabTextActive: { color: COLORS.teal600 },

	tabContent: { paddingHorizontal: SPACING.xl },
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	sectionSubtitle: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.lg },

	// Profile tab
	lifecycleRow: {
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
	lifecycleRowIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	lifecycleRowTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
	lifecycleRowAge: { fontSize: 12, color: COLORS.gray400 },

	premiumCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.purple50,
		borderRadius: RADIUS.xl,
		padding: SPACING.xl,
		marginTop: SPACING.lg,
	},
	premiumTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
	premiumDesc: { fontSize: 12, color: COLORS.gray500 },
	comingSoonBadge: {
		backgroundColor: COLORS.gray200,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
	},
	comingSoonText: { fontSize: 11, fontWeight: "600", color: COLORS.gray500 },

	// Simulations tab
	emptyState: { alignItems: "center", paddingVertical: SPACING.xxxl * 2, gap: SPACING.md },
	emptyText: { fontSize: 15, color: COLORS.gray400 },

	simCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	simCardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.md },
	simTypeBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	simTypeBadgeText: { fontSize: 12, fontWeight: "600" },
	simTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray800, marginBottom: 4 },
	simSummary: { fontSize: 13, color: COLORS.gray600, marginBottom: SPACING.sm },
	simDate: { fontSize: 12, color: COLORS.gray400 },

	// Notifications tab
	settingRow: {
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
	settingRowLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flex: 1 },
	settingLabel: { fontSize: 15, fontWeight: "600", color: COLORS.gray800 },
	settingDesc: { fontSize: 12, color: COLORS.gray500 },

	// Settings tab
	menuRow: {
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
	menuRowLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
	menuLabel: { fontSize: 15, fontWeight: "600", color: COLORS.gray800 },
	menuSub: { fontSize: 12, color: COLORS.gray500 },
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.lg,
		marginTop: SPACING.xl,
	},
	logoutText: { fontSize: 15, fontWeight: "600", color: COLORS.red500 },

	// Account modal
	modalContainer: { flex: 1, backgroundColor: COLORS.background },
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
		backgroundColor: COLORS.white,
	},
	modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray900 },
	modalBody: { padding: SPACING.xl },
	modalSectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.gray500,
		marginBottom: SPACING.sm,
		marginTop: SPACING.lg,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	modalInfoRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	modalInfoText: { flex: 1, fontSize: 15, color: COLORS.gray800 },
	modalEditLink: { fontSize: 14, fontWeight: "600", color: COLORS.teal600 },
	modalEditFieldRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.teal500,
	},
	modalTextInput: {
		flex: 1,
		fontSize: 15,
		color: COLORS.gray800,
		paddingVertical: 4,
		paddingHorizontal: SPACING.sm,
	},
	modalSmallBtn: {
		backgroundColor: COLORS.teal600,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.sm,
	},
	modalSmallBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.white },
	modalDangerSection: {
		marginTop: SPACING.xxxl,
		backgroundColor: COLORS.red50,
		borderRadius: RADIUS.lg,
		padding: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.red100,
	},
	modalDangerTitle: { fontSize: 15, fontWeight: "700", color: COLORS.red600, marginBottom: SPACING.xs },
	modalDangerDesc: { fontSize: 13, color: COLORS.gray600, lineHeight: 20, marginBottom: SPACING.lg },
	modalDangerBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.red500,
	},
	modalDangerBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.red500 },

	// App info modal
	appInfoOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: SPACING.xl,
	},
	appInfoCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.xl,
		padding: SPACING.xxl,
		width: "100%",
		maxWidth: 320,
		alignItems: "center",
	},
	appInfoIconWrap: {
		width: 72,
		height: 72,
		borderRadius: 20,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.lg,
	},
	appInfoName: { fontSize: 20, fontWeight: "700", color: COLORS.gray900, marginBottom: 4 },
	appInfoVersion: { fontSize: 14, color: COLORS.gray500, marginBottom: SPACING.lg },
	appInfoDivider: { width: 40, height: 1, backgroundColor: COLORS.gray200, marginBottom: SPACING.lg },
	appInfoDesc: { fontSize: 13, color: COLORS.gray600, textAlign: "center", lineHeight: 20, marginBottom: SPACING.md },
	appInfoCopyright: { fontSize: 11, color: COLORS.gray400, marginBottom: SPACING.xl },
	appInfoCloseBtn: {
		backgroundColor: COLORS.teal600,
		paddingHorizontal: SPACING.xxxl,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
	},
	appInfoCloseBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.white },
});

export default MyPageScreen;
