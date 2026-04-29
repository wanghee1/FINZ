import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { YearlyIncomeData, EmploymentType, AuthStatus, DataFetchStatus } from "../../types";
import { getClaimableYears } from "../../utils/youthTaxCalculator";
import { AUTH_PROVIDERS, TELECOM_OPTIONS, AuthProviderId } from "../../services/track1Service";
import step3Styles from "./step3Styles";

// ──────────────────────────────────────────
// 공통 타입 (v2.3: 세액공제 필드 추가)
// ──────────────────────────────────────────

export interface IncomeInputRecord {
	totalSalary: string;
	calculatedTax: string;
	wageTaxCredit: string;
	determinedTax: string;
	reductionApplied: boolean;
}

// ──────────────────────────────────────────
// 분석 대상 연도 카드
// ──────────────────────────────────────────

export const YearRangeCard: React.FC<{
	targetYears: number[];
}> = ({ targetYears }) => {
	if (targetYears.length === 0) {
		return (
			<View style={step3Styles.emptyYearsCard}>
				<Ionicons name="alert-circle-outline" size={24} color={COLORS.orange600} />
				<Text style={step3Styles.emptyYearsText}>
					분석 가능한 과세연도가 없습니다.{"\n"}
					최초 취업일을 확인해주세요.
				</Text>
			</View>
		);
	}

	const first = targetYears[0];
	const last = targetYears[targetYears.length - 1];

	return (
		<View style={step3Styles.yearRangeCard}>
			<Ionicons name="calendar-outline" size={18} color={COLORS.teal700} />
			<View style={{ flex: 1, marginLeft: SPACING.sm }}>
				<Text style={step3Styles.yearRangeTitle}>계산 대상 과세연도</Text>
				<Text style={step3Styles.yearRangeText}>
					{first}년 ~ {last}년 ({targetYears.length}개 연도)
				</Text>
				<Text style={step3Styles.yearRangeHint}>
					최초 취업일 기준으로 감면 기간과 경정청구 기간을 자동 계산했습니다
				</Text>
			</View>
		</View>
	);
};

// ──────────────────────────────────────────
// 모드 선택 (자동/수동)
// ──────────────────────────────────────────

export const ModeSelector: React.FC<{
	incomeMode: "auto" | "manual";
	setIncomeMode: (v: "auto" | "manual") => void;
}> = ({ incomeMode, setIncomeMode }) => (
	<View style={step3Styles.modeSelector}>
		<TouchableOpacity
			style={[step3Styles.modeButton, incomeMode === "auto" && step3Styles.modeButtonActive]}
			onPress={() => setIncomeMode("auto")}
		>
			<Ionicons name="flash-outline" size={18} color={incomeMode === "auto" ? COLORS.white : COLORS.gray500} />
			<Text style={[step3Styles.modeText, incomeMode === "auto" && step3Styles.modeTextActive]}>자동 조회</Text>
		</TouchableOpacity>
		<TouchableOpacity
			style={[step3Styles.modeButton, incomeMode === "manual" && step3Styles.modeButtonActive]}
			onPress={() => setIncomeMode("manual")}
		>
			<Ionicons name="create-outline" size={18} color={incomeMode === "manual" ? COLORS.white : COLORS.gray500} />
			<Text style={[step3Styles.modeText, incomeMode === "manual" && step3Styles.modeTextActive]}>수동 입력</Text>
		</TouchableOpacity>
	</View>
);

// ──────────────────────────────────────────
// 자동 조회 — 간편인증 UI (CODEF 2WAY)
// ──────────────────────────────────────────

interface AutoModeInfoProps {
	authStatus: AuthStatus;
	authError: string | null;
	dataFetchStatus: DataFetchStatus;
	dataFetchError: string | null;
	remainingSec: number;
	// 간편인증 입력값
	userName: string;
	setUserName: (v: string) => void;
	userMobile: string;
	setUserMobile: (v: string) => void;
	selectedProvider: AuthProviderId;
	setSelectedProvider: (v: AuthProviderId) => void;
	selectedTelecom: string;
	setSelectedTelecom: (v: string) => void;
	// 콜백
	onStartAuth: () => void;
	onRequestTaxData: () => void;
}

const AUTH_STATUS_CONFIG: Record<
	AuthStatus,
	{
		icon: keyof typeof Ionicons.glyphMap;
		iconColor: string;
		label: string;
		bgColor: string;
		borderColor: string;
	}
> = {
	idle: {
		icon: "shield-outline",
		iconColor: COLORS.blue600,
		label: "간편인증 대기",
		bgColor: COLORS.blue50,
		borderColor: COLORS.blue100,
	},
	requesting: {
		icon: "hourglass-outline",
		iconColor: COLORS.orange600,
		label: "인증 요청 중...",
		bgColor: COLORS.orange50,
		borderColor: COLORS.orange50,
	},
	waiting: {
		icon: "phone-portrait-outline",
		iconColor: COLORS.orange600,
		label: "인증 앱에서 인증을 완료해주세요",
		bgColor: COLORS.orange50,
		borderColor: COLORS.orange50,
	},
	confirmed: {
		icon: "checkmark-circle",
		iconColor: COLORS.green600,
		label: "인증 완료",
		bgColor: COLORS.green100,
		borderColor: COLORS.green100,
	},
	failed: {
		icon: "close-circle",
		iconColor: COLORS.red500,
		label: "인증 실패",
		bgColor: COLORS.red50,
		borderColor: COLORS.red100,
	},
	expired: {
		icon: "time-outline",
		iconColor: COLORS.red500,
		label: "인증 시간 만료",
		bgColor: COLORS.red50,
		borderColor: COLORS.red100,
	},
};

export const AutoModeInfo: React.FC<AutoModeInfoProps> = ({
	authStatus,
	authError,
	dataFetchStatus,
	dataFetchError,
	remainingSec,
	userName,
	setUserName,
	userMobile,
	setUserMobile,
	selectedProvider,
	setSelectedProvider,
	selectedTelecom,
	setSelectedTelecom,
	onStartAuth,
	onRequestTaxData,
}) => {
	const providerInfo = AUTH_PROVIDERS.find((p) => p.id === selectedProvider);
	const needsTelecom = providerInfo && "requiresTelecom" in providerInfo ? providerInfo.requiresTelecom : false;
	const canStart = userName.trim().length > 0 && userMobile.replace(/\D/g, "").length >= 10;

	return (
		<View style={a.container}>
			{/* ── idle: 인증 수단 선택 + 본인정보 입력 ── */}
			{authStatus === "idle" && (
				<>
					{/* 안내 배너 */}
					<View style={a.infoBanner}>
						<View style={a.infoBannerIcon}>
							<Ionicons name="shield-checkmark" size={20} color={COLORS.blue600} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={a.infoBannerTitle}>간편인증으로 자동 조회</Text>
							<Text style={a.infoBannerDesc}>
								국세청 근로소득 지급명세서의 산출세액, 근로소득세액공제, 감면세액, 결정세액을 자동으로 불러옵니다.
							</Text>
						</View>
					</View>

					{/* 인증 수단 선택 */}
					<View style={a.section}>
						<Text style={a.sectionTitle}>인증 수단</Text>
						<View style={a.providerGrid}>
							{AUTH_PROVIDERS.map((p) => {
								const active = selectedProvider === p.id;
								return (
									<TouchableOpacity
										key={p.id}
										style={[a.providerCard, active && a.providerCardActive]}
										onPress={() => setSelectedProvider(p.id)}
										activeOpacity={0.7}
									>
										<View style={[a.providerIconWrap, active && a.providerIconWrapActive]}>
											<Ionicons
												name={p.icon}
												size={22}
												color={active ? COLORS.white : COLORS.gray500}
											/>
										</View>
										<Text style={[a.providerLabel, active && a.providerLabelActive]}>
											{p.name}
										</Text>
										{active && (
											<View style={a.providerCheck}>
												<Ionicons name="checkmark-circle" size={16} color={COLORS.teal600} />
											</View>
										)}
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					{/* PASS 통신사 선택 */}
					{needsTelecom && (
						<View style={a.section}>
							<Text style={a.sectionTitle}>통신사</Text>
							<View style={a.telecomRow}>
								{TELECOM_OPTIONS.map((t) => {
									const active = selectedTelecom === t.value;
									return (
										<TouchableOpacity
											key={t.value}
											style={[a.telecomChip, active && a.telecomChipActive]}
											onPress={() => setSelectedTelecom(t.value)}
										>
											<Text style={[a.telecomChipText, active && a.telecomChipTextActive]}>
												{t.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					)}

					{/* 본인정보 입력 */}
					<View style={a.section}>
						<Text style={a.sectionTitle}>본인 정보</Text>
						<View style={a.inputGroup}>
							<View style={a.inputWrap}>
								<Text style={a.inputLabel}>이름</Text>
								<View style={a.inputBox}>
									<Ionicons name="person-outline" size={18} color={COLORS.gray400} />
									<TextInput
										style={a.textInput}
										placeholder="홍길동"
										placeholderTextColor={COLORS.gray300}
										value={userName}
										onChangeText={setUserName}
										autoCapitalize="none"
									/>
								</View>
							</View>
							<View style={a.inputWrap}>
								<Text style={a.inputLabel}>휴대폰 번호</Text>
								<View style={a.inputBox}>
									<Ionicons name="call-outline" size={18} color={COLORS.gray400} />
									<TextInput
										style={a.textInput}
										placeholder="01012345678"
										placeholderTextColor={COLORS.gray300}
										value={userMobile}
										onChangeText={setUserMobile}
										keyboardType="phone-pad"
										maxLength={11}
									/>
								</View>
							</View>
						</View>
					</View>

					{/* 인증 시작 버튼 */}
					<TouchableOpacity
						style={[a.startBtn, !canStart && a.startBtnDisabled]}
						onPress={onStartAuth}
						disabled={!canStart}
						activeOpacity={0.8}
					>
						<View style={a.startBtnInner}>
							<Ionicons name="shield-checkmark-outline" size={20} color={COLORS.white} />
							<Text style={a.startBtnText}>간편인증 시작하기</Text>
						</View>
						<Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
					</TouchableOpacity>
				</>
			)}

			{/* ── requesting: 요청 중 ── */}
			{authStatus === "requesting" && (
				<View style={a.stateCard}>
					<ActivityIndicator size="large" color={COLORS.blue600} />
					<Text style={a.stateTitle}>인증 요청 중...</Text>
					<Text style={a.stateDesc}>인증 앱으로 요청을 전송하고 있습니다.</Text>
				</View>
			)}

			{/* ── waiting: 인증 대기 (자동 폴링) ── */}
			{authStatus === "waiting" && (
				<View style={a.stateCard}>
					<View style={a.pulseWrap}>
						<ActivityIndicator size="large" color={COLORS.orange500} />
					</View>
					<Text style={a.stateTitle}>
						{providerInfo?.name ?? "인증 앱"}에서{"\n"}인증을 완료해주세요
					</Text>
					<Text style={a.stateDesc}>인증이 완료되면 자동으로 진행됩니다.</Text>
					<View style={a.timerPill}>
						<Ionicons name="time-outline" size={16} color={COLORS.orange600} />
						<Text style={a.timerText}>
							{Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
						</Text>
					</View>
				</View>
			)}

			{/* ── confirmed: 인증 완료, 데이터 조회 중 ── */}
			{authStatus === "confirmed" && (dataFetchStatus === "idle" || dataFetchStatus === "loading") && (
				<View style={a.stateCard}>
					<View style={a.successIcon}>
						<Ionicons name="checkmark" size={28} color={COLORS.white} />
					</View>
					<Text style={a.stateTitle}>인증 완료</Text>
					<View style={a.fetchingRow}>
						<ActivityIndicator size="small" color={COLORS.teal600} />
						<Text style={[a.stateDesc, { color: COLORS.teal700 }]}>
							소득 데이터를 조회하고 있습니다...
						</Text>
					</View>
				</View>
			)}

			{/* ── confirmed + no_data: 데이터 없음 ── */}
			{authStatus === "confirmed" && dataFetchStatus === "no_data" && (
				<View style={a.stateCard}>
					<View style={a.successIcon}>
						<Ionicons name="checkmark" size={28} color={COLORS.white} />
					</View>
					<Text style={a.stateTitle}>인증 완료</Text>
					<View style={a.noDataBanner}>
						<Ionicons name="information-circle-outline" size={20} color={COLORS.orange600} />
						<Text style={a.noDataText}>
							조회된 근로소득 데이터가 없습니다.{"\n"}수동 입력 모드로 전환해주세요.
						</Text>
					</View>
				</View>
			)}

			{/* ── failed / expired: 오류 + 재시도 ── */}
			{(authStatus === "failed" || authStatus === "expired") && (
				<View style={a.stateCard}>
					<View style={a.errorIcon}>
						<Ionicons name="close" size={28} color={COLORS.white} />
					</View>
					<Text style={a.stateTitle}>
						{authStatus === "expired" ? "인증 시간 만료" : "인증 실패"}
					</Text>
					<Text style={[a.stateDesc, { color: COLORS.red500 }]}>
						{authError || (authStatus === "expired" ? "제한 시간이 초과되었습니다." : "인증에 실패했습니다.")}
					</Text>
					<TouchableOpacity style={a.retryBtn} onPress={onStartAuth} activeOpacity={0.8}>
						<Ionicons name="refresh-outline" size={18} color={COLORS.white} />
						<Text style={a.retryBtnText}>다시 시도</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* ── 데이터 조회 결과 배너 ── */}
			{dataFetchStatus === "success" && (
				<View style={a.resultBanner}>
					<View style={a.resultBannerIcon}>
						<Ionicons name="checkmark-circle" size={22} color={COLORS.green600} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={a.resultBannerTitle}>소득 데이터 조회 완료</Text>
						<Text style={a.resultBannerDesc}>
							자동으로 입력되었습니다. 아래 "시뮬레이션 결과 보기"를 눌러주세요.
						</Text>
					</View>
				</View>
			)}

			{dataFetchStatus === "no_data" && (
				<View style={[a.resultBanner, { backgroundColor: COLORS.orange50, borderColor: COLORS.orange50 }]}>
					<View style={[a.resultBannerIcon, { backgroundColor: COLORS.orange50 }]}>
						<Ionicons name="alert-circle" size={22} color={COLORS.orange600} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[a.resultBannerTitle, { color: COLORS.orange600 }]}>소득 데이터 없음</Text>
						<Text style={a.resultBannerDesc}>
							{dataFetchError || "국세청에 지급명세서가 등록되지 않았거나, 해당 연도에 근로소득이 없습니다."}
						</Text>
						<Text style={a.resultBannerHint}>
							수동 입력 모드로 전환하여 직접 입력해주세요.
						</Text>
					</View>
				</View>
			)}

			{dataFetchStatus === "error" && (
				<View style={[a.resultBanner, { backgroundColor: COLORS.red50, borderColor: COLORS.red100 }]}>
					<View style={[a.resultBannerIcon, { backgroundColor: COLORS.red50 }]}>
						<Ionicons name="warning" size={22} color={COLORS.red500} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[a.resultBannerTitle, { color: COLORS.red500 }]}>조회 실패</Text>
						<Text style={a.resultBannerDesc}>
							{dataFetchError || "데이터 조회에 실패했습니다."}
						</Text>
						<TouchableOpacity style={a.retrySmall} onPress={onRequestTaxData} activeOpacity={0.8}>
							<Ionicons name="refresh-outline" size={14} color={COLORS.white} />
							<Text style={a.retrySmallText}>다시 시도</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	);
};

const a = StyleSheet.create({
	container: {
		marginBottom: SPACING.xl,
		gap: SPACING.lg,
	},
	// ── 안내 배너 ──
	infoBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: COLORS.blue50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		gap: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.blue100,
	},
	infoBannerIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: COLORS.white,
		alignItems: "center",
		justifyContent: "center",
	},
	infoBannerTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: 4,
	},
	infoBannerDesc: {
		fontSize: 13,
		color: COLORS.gray600,
		lineHeight: 19,
	},
	// ── 섹션 ──
	section: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.gray700,
		marginBottom: SPACING.md,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	// ── 인증 수단 그리드 (2열) ──
	providerGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: SPACING.sm,
	},
	providerCard: {
		width: "48%" as any,
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.md,
		borderRadius: RADIUS.md,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.gray50,
		gap: SPACING.sm,
		position: "relative" as const,
	},
	providerCardActive: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.teal50,
	},
	providerIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: COLORS.gray100,
		alignItems: "center",
		justifyContent: "center",
	},
	providerIconWrapActive: {
		backgroundColor: COLORS.teal600,
	},
	providerLabel: {
		flex: 1,
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray600,
	},
	providerLabelActive: {
		color: COLORS.teal700,
		fontWeight: "700",
	},
	providerCheck: {
		position: "absolute" as const,
		top: 6,
		right: 6,
	},
	// ── 통신사 ──
	telecomRow: {
		flexDirection: "row",
		gap: SPACING.sm,
	},
	telecomChip: {
		flex: 1,
		alignItems: "center",
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.gray50,
	},
	telecomChipActive: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.teal50,
	},
	telecomChipText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray500,
	},
	telecomChipTextActive: {
		color: COLORS.teal700,
		fontWeight: "700",
	},
	// ── 본인정보 입력 ──
	inputGroup: {
		gap: SPACING.md,
	},
	inputWrap: {
		gap: 6,
	},
	inputLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.gray500,
		marginLeft: 4,
	},
	inputBox: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.md,
		backgroundColor: COLORS.gray50,
		gap: SPACING.sm,
	},
	textInput: {
		flex: 1,
		paddingVertical: 14,
		fontSize: 15,
		color: COLORS.gray900,
	},
	// ── 인증 시작 버튼 ──
	startBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: COLORS.blue600,
		paddingVertical: 16,
		paddingHorizontal: SPACING.xl,
		borderRadius: RADIUS.md,
	},
	startBtnDisabled: {
		backgroundColor: COLORS.gray300,
	},
	startBtnInner: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
	},
	startBtnText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
	// ── 상태 카드 (waiting / confirmed / failed) ──
	stateCard: {
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		paddingVertical: 36,
		paddingHorizontal: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		gap: SPACING.md,
	},
	pulseWrap: {
		marginBottom: SPACING.sm,
	},
	stateTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
	},
	stateDesc: {
		fontSize: 14,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 21,
	},
	timerPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: COLORS.orange50,
		paddingVertical: SPACING.sm,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.full,
		borderWidth: 1,
		borderColor: COLORS.orange50,
		marginTop: SPACING.sm,
	},
	timerText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.orange600,
		fontVariant: ["tabular-nums"],
	},
	successIcon: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: COLORS.green600,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: SPACING.sm,
	},
	errorIcon: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: COLORS.red500,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: SPACING.sm,
	},
	fetchingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
	},
	noDataBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: SPACING.sm,
		backgroundColor: COLORS.orange50,
		padding: SPACING.md,
		borderRadius: RADIUS.sm,
		marginTop: SPACING.sm,
	},
	noDataText: {
		flex: 1,
		fontSize: 13,
		color: COLORS.orange600,
		lineHeight: 20,
	},
	// ── 재시도 버튼 ──
	retryBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.gray800,
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.xxl,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		marginTop: SPACING.sm,
	},
	retryBtnText: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.white,
	},
	// ── 결과 배너 ──
	resultBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: COLORS.green100,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.green100,
		gap: SPACING.md,
	},
	resultBannerIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: COLORS.green100,
		alignItems: "center",
		justifyContent: "center",
	},
	resultBannerTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.green600,
		marginBottom: 4,
	},
	resultBannerDesc: {
		fontSize: 13,
		color: COLORS.gray600,
		lineHeight: 19,
	},
	resultBannerHint: {
		fontSize: 12,
		color: COLORS.gray400,
		marginTop: 6,
		lineHeight: 17,
	},
	retrySmall: {
		flexDirection: "row",
		alignSelf: "flex-start",
		alignItems: "center",
		marginTop: SPACING.sm,
		paddingVertical: 6,
		paddingHorizontal: SPACING.md,
		backgroundColor: COLORS.gray800,
		borderRadius: RADIUS.sm,
		gap: 4,
	},
	retrySmallText: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.white,
	},
});

// ──────────────────────────────────────────
// 입력 필드 정의 (v2.3: 세액공제 추가)
// ──────────────────────────────────────────

const INCOME_FIELDS = [
	{ key: "totalSalary", label: "총급여", hint: "원천징수영수증 [21]번" },
	{ key: "calculatedTax", label: "산출세액", hint: "[73]번" },
	{ key: "wageTaxCredit", label: "근로소득세액공제", hint: "[74]번 — 감면 전 값" },
	{ key: "determinedTax", label: "결정세액 (당초)", hint: "[77]번" },
] as const;

// ──────────────────────────────────────────
// 연도별 입력 카드
// ──────────────────────────────────────────

export const YearInputCard: React.FC<{
	year: number;
	claimType?: string;
	annualLimit: number;
	input?: IncomeInputRecord;
	updateIncomeInput: (year: number, field: string, value: string | boolean) => void;
}> = ({ year, claimType, annualLimit, input, updateIncomeInput }) => (
	<View style={step3Styles.yearInputCard}>
		<View style={step3Styles.yearInputHeader}>
			<Text style={step3Styles.yearInputTitle}>{year}년</Text>
			<View style={{ flexDirection: "row", gap: SPACING.xs }}>
				<View
					style={[
						step3Styles.yearInputBadge,
						claimType === "COMPANY"
							? { backgroundColor: COLORS.teal50 }
							: { backgroundColor: COLORS.blue50 },
					]}
				>
					<Text
						style={[
							step3Styles.yearInputBadgeText,
							claimType === "COMPANY" ? { color: COLORS.teal600 } : { color: COLORS.blue600 },
						]}
					>
						{claimType === "COMPANY" ? "현재 연도" : "경정청구"}
					</Text>
				</View>
				<View style={[step3Styles.yearInputBadge, { backgroundColor: COLORS.gray100 }]}>
					<Text style={[step3Styles.yearInputBadgeText, { color: COLORS.gray600 }]}>
						한도 {annualLimit >= 99999999 ? "없음" : `${(annualLimit / 10000).toFixed(0)}만`}
					</Text>
				</View>
			</View>
		</View>

		<View style={step3Styles.yearInputGrid}>
			{INCOME_FIELDS.map((field) => (
				<View key={field.key} style={step3Styles.yearInputField}>
					<Text style={step3Styles.miniLabel}>
						{field.label} <Text style={{ fontSize: 10, color: COLORS.gray300 }}>{field.hint}</Text>
					</Text>
					<TextInput
						style={step3Styles.miniInput}
						placeholder="0"
						placeholderTextColor={COLORS.gray300}
						keyboardType="numeric"
						value={(input?.[field.key] as string) || ""}
						onChangeText={(v) => updateIncomeInput(year, field.key, v)}
					/>
				</View>
			))}
		</View>

		<TouchableOpacity
			style={step3Styles.reductionToggle}
			onPress={() => updateIncomeInput(year, "reductionApplied", !input?.reductionApplied)}
		>
			<Ionicons
				name={input?.reductionApplied ? "checkbox" : "square-outline"}
				size={20}
				color={input?.reductionApplied ? COLORS.orange500 : COLORS.gray400}
			/>
			<Text style={step3Styles.reductionToggleText}>이 연도에 이미 감면이 적용되었습니다</Text>
		</TouchableOpacity>
	</View>
);

// ──────────────────────────────────────────
// 수동 입력 전체 섹션
// ──────────────────────────────────────────

export const ManualInputSection: React.FC<{
	employmentDate: string;
	targetYears: number[];
	employmentType: EmploymentType;
	incomeInputs: Record<number, IncomeInputRecord>;
	updateIncomeInput: (year: number, field: string, value: string | boolean) => void;
}> = ({ employmentDate, targetYears, employmentType, incomeInputs, updateIncomeInput }) => (
	<View style={step3Styles.manualInputSection}>
		{targetYears.map((year) => {
			const claimType = getClaimableYears(employmentDate, new Date(), employmentType).find(
				(c) => c.year === year,
			)?.type;
			const annualLimit = year <= 2022 ? 1_500_000 : 2_000_000;
			return (
				<YearInputCard
					key={year}
					year={year}
					claimType={claimType}
					annualLimit={annualLimit}
					input={incomeInputs[year]}
					updateIncomeInput={updateIncomeInput}
				/>
			);
		})}
	</View>
);

// ──────────────────────────────────────────
// 수동 입력 → YearlyIncomeData 변환 (v2.3)
// ──────────────────────────────────────────

const parseNum = (s: string | undefined): number => parseInt(s || "0", 10);

export const buildManualIncome = (years: number[], inputs: Record<number, IncomeInputRecord>): YearlyIncomeData[] =>
	years.map((year) => {
		const inp = inputs[year];
		const totalSalary = parseNum(inp?.totalSalary);
		const calculatedTax = parseNum(inp?.calculatedTax);
		const wageTaxCredit = parseNum(inp?.wageTaxCredit);
		const determinedTax = parseNum(inp?.determinedTax);

		return {
			year,
			totalSalary,
			salaryFromSme: totalSalary,
			earnedIncomeAmount: Math.floor(totalSalary * 0.75),
			otherIncomeAmount: 0,
			calculatedTax,
			wageTaxCreditBeforeReduction:
				wageTaxCredit > 0 ? wageTaxCredit : Math.max(0, calculatedTax - determinedTax),
			originallyReportedReductionAmount: 0,
			originallyReportedFinalTax: determinedTax,
			reductionApplied: inp?.reductionApplied ?? false,
			isSme: true,
		};
	});
