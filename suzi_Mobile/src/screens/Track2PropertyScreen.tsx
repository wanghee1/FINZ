/**
 * 2주택자 6Way 세금 비교 시뮬레이션
 *
 * 3단계 플로우: intro → input → result
 * A/B 두 주택 정보 입력 → 서버 6Way 계산 → 결과 표시
 *
 * 로컬 계산 없이 서버 API로만 계산:
 *   createSimulation() → updateInputs() → calculate() → getResult()
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { COLORS, SPACING } from "../theme";
import { eokToWon, formatKorean } from "../utils/formatters";
import simulationStorage from "../services/simulationStorage";
import { formatTrack2ShareText, generateTrack2PdfHtml } from "../utils/resultFormatters";
import track2Service from "../services/track2Service";
import { useAuth } from "../context/AuthContext";
import { useAIChat } from "../context/AIChatContext";
import type { ScreenContextKey } from "../constants/aiChatConstants";

import { Step, PropertyInput, DoneeRelation, SixWayResult } from "./track2/types";
import Track2IntroStep from "./track2/Track2IntroStep";
import Track2InputStep from "./track2/Track2InputStep";
import Track2ResultStep from "./track2/Track2ResultStep";

// ── 상수 ────────────────────────────────────

const STEPS: Step[] = ["intro", "input", "result"];
const STEP_LABELS = ["서비스 소개", "주택 정보", "결과"];

const defaultPropertyInput = (): PropertyInput => ({
	address: "",
	market_price: "",
	acquisition_price: "",
	acquired_at: "",
	is_regulated: true,
	lease_deposit: "",
	loan_balance: "",
});

// ── 메인 컴포넌트 ────────────────────────────

/** Track2 step → AI 컨텍스트 키 매핑 */
const STEP_TO_AI_CONTEXT: Record<Step, ScreenContextKey> = {
	intro: "track2_intro",
	input: "track2_input",
	result: "track2_result",
};

const Track2PropertyScreen = () => {
	const navigation = useNavigation<any>();
	const { user } = useAuth();
	const { setScreenContext } = useAIChat();

	// 스텝 관리
	const [step, setStep] = useState<Step>("intro");
	const stepIdx = STEPS.indexOf(step);

	// 주택 입력 상태
	const [propertyA, setPropertyA] = useState<PropertyInput>(defaultPropertyInput());
	const [propertyB, setPropertyB] = useState<PropertyInput>(defaultPropertyInput());
	const [doneeRelation, setDoneeRelation] = useState<DoneeRelation>("LINEAL_DESCENDANT_ADULT");

	// AI 챗봇 컨텍스트 — step 변경 시 자동 업데이트
	useEffect(() => {
		setScreenContext(STEP_TO_AI_CONTEXT[step]);
	}, [step, setScreenContext]);

	// ── 뒤로가기 방지 — 입력 중 이탈 경고 ──
	useEffect(() => {
		const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
			// intro 또는 result 단계에서는 자유롭게 나갈 수 있음
			if (step === "intro" || step === "result") return;

			// input 단계에서 데이터가 있으면 경고
			const hasInput =
				propertyA.market_price !== "" ||
				propertyA.address !== "" ||
				propertyB.market_price !== "" ||
				propertyB.address !== "";
			if (hasInput) {
				e.preventDefault();
				Alert.alert(
					"입력 내용이 사라집니다",
					"지금 나가면 입력한 주택 정보가 저장되지 않습니다.",
					[
						{ text: "계속 입력", style: "cancel" },
						{ text: "나가기", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
					],
				);
			}
		});
		return unsubscribe;
	}, [navigation, step, propertyA, propertyB]);

	// 결과 상태
	const [sixWayResult, setSixWayResult] = useState<SixWayResult | null>(null);

	// 백엔드 연동 상태
	const [simulationId, setSimulationId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [aiLoading, setAiLoading] = useState(false);

	// ── 속성 변경 핸들러 ────────────────────

	const updatePropertyA = useCallback((patch: Partial<PropertyInput>) => {
		setPropertyA((prev) => ({ ...prev, ...patch }));
	}, []);

	const updatePropertyB = useCallback((patch: Partial<PropertyInput>) => {
		setPropertyB((prev) => ({ ...prev, ...patch }));
	}, []);

	// ── 유효성 검사 ─────────────────────────

	const isInputValid = useMemo(() => {
		const aOk =
			eokToWon(propertyA.market_price) > 0 &&
			eokToWon(propertyA.acquisition_price) > 0 &&
			propertyA.acquired_at.length >= 8;
		const bOk =
			eokToWon(propertyB.market_price) > 0 &&
			eokToWon(propertyB.acquisition_price) > 0 &&
			propertyB.acquired_at.length >= 8;
		return aOk && bOk;
	}, [propertyA, propertyB]);

	// ── 시뮬레이션 생성 ─────────────────────

	const handleStartSimulation = useCallback(async () => {
		setStep("input");
		try {
			const res = await track2Service.createSimulation("6Way 세금 비교 시뮬레이션");
			if (res.status === "success" && res.data) {
				setSimulationId((res.data as any).simulation_id ?? (res.data as any).id ?? null);
			}
		} catch (err) {
			console.warn("[Track2] 시뮬레이션 생성 실패:", err);
		}
	}, []);

	// ── 입력 데이터 서버 동기화 + 계산 ──────

	const handleCalculate = useCallback(async () => {
		if (!isInputValid) {
			Alert.alert("입력값 부족", "A주택과 B주택의 시가, 취득가, 취득일을 모두 입력해주세요.");
			return;
		}

		setIsLoading(true);
		setSixWayResult(null);
		setAiSummary(null);

		try {
			// 시뮬레이션이 없으면 생성
			let simId = simulationId;
			if (!simId) {
				const createRes = await track2Service.createSimulation("6Way 세금 비교 시뮬레이션");
				if (createRes.status === "success" && createRes.data) {
					simId = (createRes.data as any).simulation_id ?? (createRes.data as any).id ?? null;
					setSimulationId(simId);
				}
			}

			if (!simId) {
				Alert.alert(
					"시뮬레이션 생성 실패 (Simulation Create Failed)",
					"서버와 통신할 수 없어 시뮬레이션을 생성하지 못했습니다. 네트워크 연결을 확인해주세요.",
				);
				setIsLoading(false);
				return;
			}

			// 입력 데이터 동기화
			const inputPayload = {
				a_address: propertyA.address || null,
				a_market_price: eokToWon(propertyA.market_price),
				a_acquisition_price: eokToWon(propertyA.acquisition_price),
				a_acquired_at: propertyA.acquired_at || null,
				a_is_regulated: propertyA.is_regulated,
				b_address: propertyB.address || null,
				b_market_price: eokToWon(propertyB.market_price),
				b_acquisition_price: eokToWon(propertyB.acquisition_price),
				b_acquired_at: propertyB.acquired_at || null,
				b_is_regulated: propertyB.is_regulated,
				lease_deposit: eokToWon(propertyA.lease_deposit) || 0,
				loan_balance: eokToWon(propertyA.loan_balance) || 0,
				b_lease_deposit: eokToWon(propertyB.lease_deposit) || 0,
				b_loan_balance: eokToWon(propertyB.loan_balance) || 0,
				donee_relation: doneeRelation,
			};

			await track2Service.updateInputs(simId, inputPayload);

			// 계산 요청
			await track2Service.calculate(simId);

			// 결과 조회
			const resultRes = await track2Service.getResult(simId);
			if (resultRes.status === "success" && resultRes.data) {
				const data = resultRes.data as any;
				setSixWayResult({
					simulation_id: data.simulation_id ?? simId,
					scenarios: data.scenarios ?? [],
					rank_pre: data.rank_pre ?? [],
					rank_post: data.rank_post ?? [],
					optimal_pre: data.optimal_pre ?? 0,
					optimal_post: data.optimal_post ?? 0,
					risk_delta: data.risk_delta ?? 0,
					calculated_at: data.calculated_at ?? new Date().toISOString(),
				});
				setStep("result");
			} else {
				Alert.alert(
					"결과 조회 실패 (Result Fetch Failed)",
					resultRes.message ??
						"서버에서 계산 결과를 가져오지 못했습니다. 입력값을 확인 후 다시 시도해주세요.",
				);
			}
		} catch (err: any) {
			Alert.alert(
				"계산 실패 (Calculation Failed)",
				err.message ??
					"세금 계산 중 오류가 발생했습니다. 입력값을 확인하고 네트워크 연결 후 다시 시도해주세요.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [isInputValid, simulationId, propertyA, propertyB, doneeRelation]);

	// ── AI 의견 생성 ────────────────────────

	const handleGenerateAiSummary = useCallback(async () => {
		if (!simulationId) {
			Alert.alert("알림", "시뮬레이션이 생성되지 않아 AI 의견을 생성할 수 없습니다.");
			return;
		}
		setAiLoading(true);
		try {
			const res = await track2Service.generateAiSummary(simulationId, "SHORT");
			if (res.status === "success" && res.data) {
				const summary = (res.data as any).summary ?? (res.data as any).text ?? "";
				setAiSummary(summary);
			} else {
				Alert.alert(
					"AI 요약 실패 (AI Summary Failed)",
					res.message ?? "AI 의견을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
				);
			}
		} catch (err: any) {
			Alert.alert(
				"AI 요약 실패 (AI Summary Error)",
				err.message ?? "AI 서버 통신 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.",
			);
		} finally {
			setAiLoading(false);
		}
	}, [simulationId]);

	// ── 결과 저장 ───────────────────────────

	const handleSaveResult = useCallback(async () => {
		if (!sixWayResult || !user?.id) return;
		const optPre = sixWayResult.scenarios.find((s) => s.scenario_no === sixWayResult.optimal_pre);
		await simulationStorage.save(user.id, {
			id: simulationId ?? `t2-${Date.now()}`,
			type: "property",
			title: "6Way 세금 비교 시뮬레이션",
			summary: optPre ? `비중과 최적: ${optPre.label} (${formatKorean(optPre.pre_total)})` : "시뮬레이션 결과",
			createdAt: new Date().toISOString().slice(0, 10),
			data: sixWayResult,
		});
		Alert.alert("저장 완료", "시뮬레이션 결과가 저장되었습니다.");
	}, [sixWayResult, simulationId]);

	// ── 결과 공유 ───────────────────────────

	const handleShareResult = useCallback(async () => {
		if (!sixWayResult) return;
		const text = formatTrack2ShareText(sixWayResult);
		await Share.share({ message: text });
	}, [sixWayResult]);

	// ── PDF 생성 & 공유 ─────────────────────

	const handlePdfResult = useCallback(async () => {
		if (!sixWayResult) return;
		try {
			const html = generateTrack2PdfHtml(sixWayResult);
			const { uri } = await Print.printToFileAsync({ html });
			await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
		} catch (err: any) {
			Alert.alert(
				"PDF 생성 실패 (PDF Export Failed)",
				"PDF 파일을 생성하지 못했습니다. 저장 공간이 부족하거나 권한이 없을 수 있습니다.",
			);
		}
	}, [sixWayResult]);

	// ── 시뮬레이션 삭제 ─────────────────────

	const handleDeleteSimulation = useCallback(async () => {
		if (!simulationId) return;
		Alert.alert("시뮬레이션 삭제", "이 시뮬레이션을 삭제하시겠습니까?", [
			{ text: "취소", style: "cancel" },
			{
				text: "삭제",
				style: "destructive",
				onPress: async () => {
					try {
						await track2Service.deleteSimulation(simulationId);
						setSimulationId(null);
						setSixWayResult(null);
						setAiSummary(null);
						setStep("intro");
					} catch (err: any) {
						Alert.alert(
							"삭제 실패 (Simulation Delete Failed)",
							err.message ?? "서버에서 시뮬레이션을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.",
						);
					}
				},
			},
		]);
	}, [simulationId]);

	// ── 네비게이션 ──────────────────────────

	const goBack = () => {
		if (stepIdx === 0) navigation.goBack();
		else setStep(STEPS[stepIdx - 1]);
	};

	// ── 렌더링 ──────────────────────────────

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={goBack} accessibilityLabel="뒤로 가기">
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<Text style={styles.topBarTitle}>6Way 세금 비교</Text>
				<TouchableOpacity onPress={() => navigation.navigate("MainTab")} accessibilityLabel="홈으로 가기">
					<Ionicons name="home-outline" size={22} color={COLORS.gray500} />
				</TouchableOpacity>
			</View>

			<ProgressBar stepIdx={stepIdx} totalSteps={STEPS.length} />

			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{step === "intro" && <Track2IntroStep onStart={handleStartSimulation} />}
				{step === "input" && (
					<Track2InputStep
						propertyA={propertyA}
						propertyB={propertyB}
						doneeRelation={doneeRelation}
						onPropertyAChange={updatePropertyA}
						onPropertyBChange={updatePropertyB}
						onDoneeRelationChange={setDoneeRelation}
						onCalculate={handleCalculate}
						isInputValid={isInputValid}
						isLoading={isLoading}
						simulationId={simulationId}
					/>
				)}
				{step === "result" && sixWayResult && (
					<Track2ResultStep
						result={sixWayResult}
						onRestart={() => {
							setAiSummary(null);
							setStep("input");
						}}
						onConsultant={() =>
							navigation.navigate("TaxConsultantList", {
								from: "Track2Property",
							})
						}
						onGoHome={() => navigation.navigate("MainTab")}
						isLoading={isLoading}
						simulationId={simulationId}
						aiSummary={aiSummary}
						aiLoading={aiLoading}
						onGenerateAiSummary={handleGenerateAiSummary}
						onDeleteSimulation={handleDeleteSimulation}
						onSave={handleSaveResult}
						onShare={handleShareResult}
						onPdf={handlePdfResult}
					/>
				)}
			</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// ── 프로그레스 바 ────────────────────────────

const ProgressBar: React.FC<{
	stepIdx: number;
	totalSteps: number;
}> = ({ stepIdx, totalSteps }) => (
	<>
		<View style={styles.progressRow}>
			{STEP_LABELS.map((label, i) => (
				<View key={i} style={styles.progressItem}>
					<View style={[styles.progressDot, i <= stepIdx && styles.progressDotActive]} />
					<Text style={[styles.progressLabel, i <= stepIdx && styles.progressLabelActive]}>{label}</Text>
				</View>
			))}
		</View>
		<View style={styles.progressBar}>
			<View style={[styles.progressFill, { width: `${((stepIdx + 1) / totalSteps) * 100}%` }]} />
		</View>
	</>
);

// ── 스타일 ──────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.white,
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
	},
	topBarTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	scroll: {
		paddingBottom: 48,
	},
	progressRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		marginBottom: SPACING.xs,
	},
	progressItem: {
		alignItems: "center",
		flex: 1,
	},
	progressDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLORS.gray200,
		marginBottom: 4,
	},
	progressDotActive: {
		backgroundColor: COLORS.blue600,
	},
	progressLabel: {
		fontSize: 10,
		color: COLORS.gray400,
		fontWeight: "600",
	},
	progressLabelActive: {
		color: COLORS.blue600,
		fontWeight: "700",
	},
	progressBar: {
		height: 3,
		backgroundColor: COLORS.gray200,
		marginHorizontal: SPACING.xl,
		borderRadius: 2,
	},
	progressFill: {
		height: "100%",
		backgroundColor: COLORS.blue600,
		borderRadius: 2,
	},
});

export default Track2PropertyScreen;
