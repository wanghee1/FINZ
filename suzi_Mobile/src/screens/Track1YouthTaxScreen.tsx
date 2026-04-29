import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { COLORS, SPACING } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useAIChat } from "../context/AIChatContext";
import type { ScreenContextKey } from "../constants/aiChatConstants";
import { formatCurrency } from "../utils/formatters";
import simulationStorage from "../services/simulationStorage";
import { formatTrack1ShareText, generateTrack1PdfHtml } from "../utils/resultFormatters";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { Gender, MilitaryServiceType, EmploymentType, YouthTaxResult, AuthStatus, DataFetchStatus } from "../types";
import {
	calculateAge,
	calcTaxAge,
	needsMilitaryDoc,
	calculateMilitaryMonths,
	calculateMilitaryDeductionYears,
	formatMilitaryPeriod,
	getReductionConfig,
	getClaimableYears,
	runSimulation,
	EligibilityInput,
} from "../utils/youthTaxCalculator";
import track1Service, { AuthProviderId, CalculationResultInline } from "../services/track1Service";
import Track1IntroStep from "./track1/Track1IntroStep";
import Track1ConsentStep from "./track1/Track1ConsentStep";
import Track1BasicInfoStep from "./track1/Track1BasicInfoStep";
import Track1MilitaryStep from "./track1/Track1MilitaryStep";
import Track1ResultStep from "./track1/Track1ResultStep";
import Track1CollectingStep from "./track1/Track1CollectingStep";
import { TopBar, ProgressBar } from "./track1/Track1Navigation";
import {
	YearRangeCard,
	ModeSelector,
	AutoModeInfo,
	ManualInputSection,
	IncomeInputRecord,
	buildManualIncome,
} from "./track1/Track1IncomeHelpers";
import step3Styles from "./track1/step3Styles";

type Step = "intro" | "consent" | "step1" | "step2" | "step3" | "collecting" | "result";
const STEPS: Step[] = ["intro", "consent", "step1", "step2", "step3", "collecting", "result"];
const DEFAULT_INCOME: IncomeInputRecord = {
	totalSalary: "",
	calculatedTax: "",
	wageTaxCredit: "",
	determinedTax: "",
	reductionApplied: false,
};

const AUTH_POLL_INTERVAL = 3000;
const AUTH_TIMEOUT_SEC = 270;

/** Track1 step → AI 컨텍스트 키 매핑 */
const STEP_TO_AI_CONTEXT: Record<Step, ScreenContextKey> = {
	intro: "track1_intro",
	consent: "track1_intro",
	step1: "track1_basic_info",
	step2: "track1_military",
	step3: "track1_income",
	collecting: "track1_collecting",
	result: "track1_result",
};

const Track1YouthTaxScreen = () => {
	const navigation = useNavigation<any>();
	const { user } = useAuth();
	const { setScreenContext } = useAIChat();
	const [currentStep, setCurrentStep] = useState<Step>("intro");

	const [birthDate, setBirthDate] = useState("");
	const [gender, setGender] = useState<Gender>("M");
	const [employmentDate, setEmploymentDate] = useState("");
	const [businessRegNo, setBusinessRegNo] = useState("");
	const [isSme, setIsSme] = useState(true);

	const [hasMilitary, setHasMilitary] = useState(false);
	const [militaryType, setMilitaryType] = useState<MilitaryServiceType>("active");
	const [enlistDate, setEnlistDate] = useState("");
	const [dischargeDate, setDischargeDate] = useState("");

	// AI 챗봇 컨텍스트 — step 변경 시 자동 업데이트
	useEffect(() => {
		setScreenContext(STEP_TO_AI_CONTEXT[currentStep]);
	}, [currentStep, setScreenContext]);

	const [incomeMode, setIncomeMode] = useState<"auto" | "manual">("manual");
	const [incomeInputs, setIncomeInputs] = useState<Record<number, IncomeInputRecord>>({});

	const [simulationResult, setSimulationResult] = useState<YouthTaxResult | null>(null);
	const [expandedYear, setExpandedYear] = useState<number | null>(null);

	// ── 간편인증 & API 연동 상태 ──
	const [authRequestId, setAuthRequestId] = useState<string | null>(null);
	const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
	const [authError, setAuthError] = useState<string | null>(null);
	const [dataFetchStatus, setDataFetchStatus] = useState<DataFetchStatus>("idle");
	const [dataFetchError, setDataFetchError] = useState<string | null>(null);
	const [serverResult, setServerResult] = useState<CalculationResultInline | null>(null);
	const [isCalculating, setIsCalculating] = useState(false);
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── 간편인증 입력 상태 ──
	const [userName, setUserName] = useState("");
	const [userMobile, setUserMobile] = useState("");
	const [selectedProvider, setSelectedProvider] = useState<AuthProviderId>("kakao");
	const [selectedTelecom, setSelectedTelecom] = useState("0");
	const [remainingSec, setRemainingSec] = useState(AUTH_TIMEOUT_SEC);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stepIndex = STEPS.indexOf(currentStep);

	// ── 뒤로가기 방지 — 입력/수집 중 이탈 경고 ──
	useEffect(() => {
		const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
			// intro 단계에서는 자유롭게 나갈 수 있음
			if (currentStep === "intro") return;

			// 데이터 수집 중이면 반드시 경고
			if (currentStep === "collecting" && dataFetchStatus === "loading") {
				e.preventDefault();
				Alert.alert(
					"데이터 수집 중",
					"수집이 진행 중입니다. 중단하면 처음부터 다시 시작해야 합니다.",
					[
						{ text: "계속 수집", style: "cancel" },
						{ text: "중단하기", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
					],
				);
				return;
			}

			// 입력이 시작된 상태에서 나가려고 할 때 경고
			const hasInput = birthDate || employmentDate || businessRegNo || Object.keys(incomeInputs).length > 0;
			if (hasInput && currentStep !== "result") {
				e.preventDefault();
				Alert.alert(
					"입력 내용이 사라집니다",
					"지금 나가면 입력한 정보가 저장되지 않습니다.",
					[
						{ text: "계속 입력", style: "cancel" },
						{ text: "나가기", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
					],
				);
			}
		});
		return unsubscribe;
	}, [navigation, currentStep, dataFetchStatus, birthDate, employmentDate, businessRegNo, incomeInputs]);

	const militaryInfo = useMemo(() => {
		if (!hasMilitary || !enlistDate || !dischargeDate) return null;
		try {
			const months = calculateMilitaryMonths(enlistDate, dischargeDate);
			const deductionYears = calculateMilitaryDeductionYears(enlistDate, dischargeDate);
			return { months, deductionYears, formatted: formatMilitaryPeriod(months) };
		} catch {
			return null;
		}
	}, [hasMilitary, enlistDate, dischargeDate]);

	const ageInfo = useMemo(() => {
		if (!birthDate || !employmentDate) return null;
		try {
			const age = calculateAge(birthDate, employmentDate);
			const milMonths = militaryInfo?.months ?? 0;
			const taxAge = calcTaxAge(birthDate, employmentDate, milMonths, gender);
			const adjustedAge = Math.floor(taxAge);
			const needsMilDoc = needsMilitaryDoc(birthDate, employmentDate, gender);

			let employmentType: EmploymentType | null = null;
			if (taxAge >= 15 && taxAge <= 34) employmentType = "YOUTH";
			else if (age >= 60) employmentType = "SENIOR";

			return { age, taxAge, adjustedAge, employmentType, needsMilitaryDoc: needsMilDoc };
		} catch {
			return null;
		}
	}, [birthDate, employmentDate, gender, militaryInfo]);

	const employmentType: EmploymentType = ageInfo?.employmentType ?? "YOUTH";

	const targetYears = useMemo(() => {
		if (!employmentDate) return [];
		try {
			return getClaimableYears(employmentDate, new Date(), employmentType).map((c) => c.year);
		} catch {
			return [];
		}
	}, [employmentDate, employmentType]);

	const reductionConfig = useMemo(() => {
		if (!employmentDate) return null;
		try {
			return getReductionConfig(employmentDate);
		} catch {
			return null;
		}
	}, [employmentDate]);

	// ── 타이머 & 폴링 cleanup ──
	useEffect(() => {
		return () => {
			if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);


	// ── 간편인증 시작 (CODEF 2WAY) ──
	const handleStartAuth = useCallback(async () => {
		if (!birthDate) {
			Alert.alert("알림", "생년월일을 먼저 입력해주세요.");
			return;
		}
		if (!userName.trim()) {
			Alert.alert("알림", "이름을 입력해주세요.");
			return;
		}
		const cleanMobile = userMobile.replace(/\D/g, "");
		if (!cleanMobile.match(/^01[016789]\d{7,8}$/)) {
			Alert.alert("알림", "올바른 휴대폰 번호를 입력해주세요.\n예: 01012345678");
			return;
		}

		setAuthStatus("requesting");
		setAuthError(null);

		try {
			const res = await track1Service.startAuth({
				auth_provider: selectedProvider,
				user_name: userName.trim(),
				user_birth: birthDate.replace(/-/g, ""),
				user_mobile: cleanMobile,
				telecom: selectedProvider === "pass" ? selectedTelecom : undefined,
			});

			if (res.status === "success" && res.data) {
				const data = res.data;
				setAuthRequestId(data.auth_request_id);

				if (data.status === "WAITING_2WAY") {
					setAuthStatus("waiting");
					setRemainingSec(data.timeout_sec || AUTH_TIMEOUT_SEC);
					// 타이머 시작
					startCountdown(data.timeout_sec || AUTH_TIMEOUT_SEC);
					// 자동 폴링 시작
					startPolling(data.auth_request_id);
				} else if (data.status === "VERIFIED") {
					setAuthStatus("confirmed");
				} else {
					setAuthStatus("failed");
					setAuthError(data.message || "인증 요청에 실패했습니다.");
				}
			} else {
				setAuthStatus("failed");
				setAuthError(res.message || "인증 요청에 실패했습니다.");
			}
		} catch (err: any) {
			setAuthStatus("failed");
			setAuthError(err.message || "인증 요청 중 오류가 발생했습니다.");
		}
	}, [birthDate, userName, userMobile, selectedProvider, selectedTelecom]);

	// ── 카운트다운 타이머 ──
	const startCountdown = (totalSec: number) => {
		if (timerRef.current) clearInterval(timerRef.current);
		let sec = totalSec;
		timerRef.current = setInterval(() => {
			sec -= 1;
			setRemainingSec(sec);
			if (sec <= 0) {
				if (timerRef.current) clearInterval(timerRef.current);
			}
		}, 1000);
	};

	// ── 자동 폴링 (3초 간격) ──
	const startPolling = (reqId: string) => {
		if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

		const poll = async () => {
			try {
				const res = await track1Service.confirmAuth(reqId);

				if (res.status === "success" && res.data) {
					const status = res.data.status;

					if (status === "VERIFIED") {
						setAuthStatus("confirmed");
						stopTimers();
						return;
					} else if (status === "FAILED") {
						setAuthStatus("failed");
						setAuthError(res.data.message || "인증에 실패했습니다.");
						stopTimers();
						return;
					} else if (status === "EXPIRED") {
						setAuthStatus("expired");
						setAuthError("인증 시간이 만료되었습니다. 다시 시도해주세요.");
						stopTimers();
						return;
					}
					// WAITING_2WAY → 계속 폴링
				}

				// 다음 폴링 예약
				pollTimerRef.current = setTimeout(poll, AUTH_POLL_INTERVAL);
			} catch {
				// 네트워크 에러 시 재시도
				pollTimerRef.current = setTimeout(poll, AUTH_POLL_INTERVAL);
			}
		};

		// 첫 폴링은 3초 후 시작 (사용자가 인증앱으로 이동할 시간)
		pollTimerRef.current = setTimeout(poll, AUTH_POLL_INTERVAL);
	};

	const stopTimers = () => {
		if (pollTimerRef.current) {
			clearTimeout(pollTimerRef.current);
			pollTimerRef.current = null;
		}
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	};

	// ── 인증 완료 후 세금 데이터 수집 ──
	const taxDataInFlightRef = useRef(false);
	const handleRequestTaxData = useCallback(async () => {
		if (!authRequestId) return;
		if (taxDataInFlightRef.current) {
			console.log("[Track1] tax-data request already in flight, skipping duplicate");
			return;
		}
		taxDataInFlightRef.current = true;
		setDataFetchStatus("loading");
		setDataFetchError(null);
		try {
			const res = await track1Service.requestTaxData({
				auth_request_id: authRequestId,
				years: targetYears.length > 0 ? targetYears : undefined,
				employment_date: employmentDate ? employmentDate.replace(/-/g, "") : undefined,
				gender,
				has_military: hasMilitary,
				enlist_date: hasMilitary && enlistDate ? enlistDate.replace(/-/g, "") : undefined,
				discharge_date: hasMilitary && dischargeDate ? dischargeDate.replace(/-/g, "") : undefined,
			});

			if (res.status === "success" && res.data) {
				if (res.data.status === "DONE") {
					// 소득 없는 연도 안내
					const noIncomeYears = res.data.no_income_years ?? [];
					if (noIncomeYears.length > 0) {
						const yearsStr = noIncomeYears.join(", ");
						Alert.alert(
							"안내",
							`${yearsStr}년도는 근로소득 데이터가 없어 계산에서 제외되었습니다.`,
						);
					}

					// 소득 데이터가 하나도 없는 경우 → 수동 입력 안내
					const dataYearsFound = res.data.data_years_found ?? 0;
					if (dataYearsFound === 0) {
						setDataFetchStatus("no_data");
						setDataFetchError(
							res.data.message || "인증은 성공했으나 조회된 소득 데이터가 없습니다. 수동 입력을 이용해주세요."
						);
						return;
					}

					// 서버 응답에 포함된 인라인 계산 결과 직접 사용 (DB 조회 없음)
					const calcResult = res.data.calculation_result;
					if (calcResult) {
						setServerResult(calcResult);
						// 소득 데이터를 incomeInputs에 반영 (화면 표시용)
						const yearResults = calcResult.year_results;
						if (Array.isArray(yearResults)) {
							const newInputs: Record<number, IncomeInputRecord> = {};
							yearResults.forEach((yr) => {
								if (yr.has_income_data) {
									newInputs[yr.year] = {
										totalSalary: String(yr.total_salary || ""),
										calculatedTax: String(yr.calculated_tax || ""),
										wageTaxCredit: String(yr.wage_tax_credit_before_red || ""),
										determinedTax: String(yr.originally_reported_final_tax || ""),
										reductionApplied: yr.reduction_applied ?? false,
									};
								}
								// has_income_data=false인 연도는 입력 필드를 비워둠
							});
							setIncomeInputs(newInputs);
						}
					}
					setDataFetchStatus("success");
				} else if (res.data.status === "FAILED") {
					setDataFetchStatus("error");
					setDataFetchError(res.data.message || "데이터 조회에 실패했습니다.");
				} else {
					setDataFetchStatus("error");
					setDataFetchError(res.data.message || "알 수 없는 상태입니다.");
				}
			} else {
				setDataFetchStatus("error");
				setDataFetchError(res.data?.message || res.message || "데이터 조회에 실패했습니다.");
			}
		} catch (err: any) {
			setDataFetchStatus("error");
			setDataFetchError(err.message || "데이터 조회 중 오류가 발생했습니다.");
		} finally {
			taxDataInFlightRef.current = false;
		}
	}, [authRequestId, targetYears, employmentDate, gender, hasMilitary, enlistDate, dischargeDate]);

	// ── 인증 완료 시 → collecting 화면으로 이동 + 데이터 조회 시작 ──
	const autoFetchTriggeredRef = useRef(false);
	useEffect(() => {
		if (authStatus === "confirmed" && dataFetchStatus === "idle" && !autoFetchTriggeredRef.current) {
			autoFetchTriggeredRef.current = true;
			setCurrentStep("collecting");
			handleRequestTaxData();
		}
	}, [authStatus, dataFetchStatus, handleRequestTaxData]);

	// ── 세무법인 인계 요청 ──
	const handleHandoff = useCallback(
		async (contactName: string, contactPhone: string, contactEmail?: string, memo?: string) => {
			if (!simulationResult) return;
			try {
				const calculationId = `local_${Date.now()}`;
				const res = await track1Service.createHandoff({
					calculation_id: calculationId,
					contact_name: contactName,
					contact_phone: contactPhone,
					contact_email: contactEmail,
					consent_privacy: true,
					consent_partner: true,
					memo,
				});
				if (res.status === "success") {
					Alert.alert(
						"인계 완료",
						"세무법인에 성공적으로 인계되었습니다. 담당 세무사가 곧 연락드릴 예정입니다.",
					);
					return res.data;
				} else {
					Alert.alert(
						"인계 실패",
						res.message || "세무법인 인계 데이터를 전달하지 못했습니다.",
					);
				}
			} catch (err: any) {
				Alert.alert(
					"인계 실패",
					err.message || "세무법인 인계 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
				);
			}
			return null;
		},
		[simulationResult, serverResult],
	);

	const handleRunSimulation = useCallback(async () => {
		if (!birthDate || !employmentDate) return;

		// auto 모드에서 소득 데이터가 없으면 계산 불가 안내
		const hasInputData = Object.keys(incomeInputs).length > 0;
		if (incomeMode === "auto" && !hasInputData) {
			Alert.alert(
				"소득 데이터 없음",
				"조회된 근로소득 데이터가 없어 환급액 계산이 불가능합니다.\n\n" +
				"수동 입력으로 전환하여 원천징수영수증의 소득 정보를 직접 입력해주세요.",
				[
					{ text: "수동 입력으로 전환", onPress: () => setIncomeMode("manual") },
					{ text: "확인", style: "cancel" },
				],
			);
			return;
		}

		// manual 모드에서도 입력된 데이터가 없으면 안내
		if (incomeMode === "manual" && !hasInputData) {
			Alert.alert(
				"소득 데이터 없음",
				"연도별 소득 정보를 입력해주세요.\n원천징수영수증의 총급여, 산출세액, 근로소득세액공제, 결정세액 항목이 필요합니다.",
			);
			return;
		}

		setIsCalculating(true);

		const input: EligibilityInput = {
			birthDate,
			firstEmploymentDate: employmentDate,
			gender,
			hasMilitary,
			enlistDate: hasMilitary ? enlistDate : undefined,
			dischargeDate: hasMilitary ? dischargeDate : undefined,
			isSme,
		};
		const incomeData = buildManualIncome(targetYears, incomeInputs);
		const localResult = runSimulation(input, incomeData);
		setSimulationResult(localResult);

		setIsCalculating(false);
		setCurrentStep("result");
	}, [
		birthDate,
		employmentDate,
		gender,
		hasMilitary,
		enlistDate,
		dischargeDate,
		isSme,
		incomeMode,
		incomeInputs,
		targetYears,
	]);

	// ── collecting 완료 → 시뮬레이션 실행 후 result로 이동 ──
	const handleCollectingComplete = useCallback(() => {
		handleRunSimulation();
	}, [handleRunSimulation]);

	// ── no_data 시 수동 입력으로 자동 전환 ──
	const handleSwitchToManual = useCallback(() => {
		setCurrentStep("step3");
		setIncomeMode("manual");
		setDataFetchStatus("idle");
		setAuthStatus("idle");
		autoFetchTriggeredRef.current = false;
		taxDataInFlightRef.current = false;
	}, []);

	const updateIncomeInput = (year: number, field: string, value: string | boolean) => {
		setIncomeInputs((prev) => ({
			...prev,
			[year]: { ...(prev[year] || DEFAULT_INCOME), [field]: value },
		}));
	};

	const goBack = () => {
		if (currentStep === "intro") navigation.goBack();
		else if (currentStep === "collecting") {
			// collecting 중에는 에러 상태에서만 뒤로 가기 허용
			if (dataFetchStatus === "error" || dataFetchStatus === "no_data") {
				setCurrentStep("step3");
				// 상태 리셋해서 수동 입력 전환 가능하게
				setDataFetchStatus("idle");
				setAuthStatus("idle");
				autoFetchTriggeredRef.current = false;
				taxDataInFlightRef.current = false;
			}
		} else {
			setCurrentStep(STEPS[stepIndex - 1] as Step);
		}
	};

	// ── 결과 저장 ───────────────────────────

	const handleSaveResult = useCallback(async () => {
		if (!simulationResult) return;

		// 1) 로컬 저장 (항상)
		if (!user?.id) return;
		await simulationStorage.save(user.id, {
			id: `t1-${Date.now()}`,
			type: "youth_tax",
			title: "청년 소득세 감면 시뮬레이션",
			summary: `예상 환급액: ${formatCurrency(simulationResult.totalRefundEstimate)}`,
			createdAt: new Date().toISOString().slice(0, 10),
			data: simulationResult,
		});

		// 2) 서버 저장 (서버 계산 결과가 있는 경우에만)
		if (serverResult) {
			try {
				await track1Service.saveResult({
					auth_request_id: authRequestId ?? undefined,
					employment_type: serverResult.employment_type,
					reduction_rate: serverResult.reduction_rate,
					total_estimated_refund: serverResult.total_estimated_refund,
					total_local_tax_refund: serverResult.total_local_tax_refund,
					year_results: serverResult.year_results
						.filter((yr) => yr.has_income_data)
						.map((yr) => ({
							year: yr.year,
							annual_limit: yr.annual_limit,
							raw_reduction: yr.raw_reduction,
							reduction_amount: yr.reduction_amount,
							wage_credit_after: yr.wage_credit_after,
							corrected_final_tax: yr.corrected_final_tax,
							refund_income_tax: yr.refund_income_tax,
							refund_local_tax: yr.refund_local_tax,
							refund_total: yr.refund_total,
							calc_case: yr.calc_case,
						})),
				});
			} catch {
				// 서버 저장 실패 시 로컬만 저장 완료 처리
			}
		}

		Alert.alert("저장 완료", "시뮬레이션 결과가 저장되었습니다.");
	}, [simulationResult, serverResult, authRequestId]);

	// ── 결과 공유 ───────────────────────────

	const handleShareResult = useCallback(async () => {
		if (!simulationResult) return;
		const text = formatTrack1ShareText(simulationResult);
		await Share.share({ message: text });
	}, [simulationResult]);

	// ── PDF 생성 & 공유 ─────────────────────

	const handlePdfResult = useCallback(async () => {
		if (!simulationResult) return;
		try {
			const html = generateTrack1PdfHtml(simulationResult);
			const { uri } = await Print.printToFileAsync({ html });
			await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
		} catch {
			Alert.alert("PDF 생성 실패", "PDF 파일을 생성하지 못했습니다.");
		}
	}, [simulationResult]);

	const handleRestart = () => {
		setCurrentStep("intro");
		setSimulationResult(null);
		setExpandedYear(null);
		setAuthRequestId(null);
		setAuthStatus("idle");
		setAuthError(null);
		setDataFetchStatus("idle");
		setDataFetchError(null);
		setServerResult(null);
		setUserName("");
		setUserMobile("");
		setRemainingSec(AUTH_TIMEOUT_SEC);
		autoFetchTriggeredRef.current = false;
		taxDataInFlightRef.current = false;
		stopTimers();
	};

	return (
		<SafeAreaView style={styles.container}>
			<TopBar onBack={goBack} onHome={() => navigation.navigate("MainTab")} />
			<ProgressBar stepIndex={stepIndex} />
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{currentStep === "intro" && <Track1IntroStep onStart={() => setCurrentStep("consent")} />}
			{currentStep === "consent" && <Track1ConsentStep onAgree={() => setCurrentStep("step1")} />}
				{currentStep === "step1" && (
					<Track1BasicInfoStep
						birthDate={birthDate}
						setBirthDate={setBirthDate}
						gender={gender}
						setGender={setGender}
						employmentDate={employmentDate}
						setEmploymentDate={setEmploymentDate}
						businessRegNo={businessRegNo}
						setBusinessRegNo={setBusinessRegNo}
						isSme={isSme}
						setIsSme={setIsSme}
						ageInfo={ageInfo}
						reductionConfig={reductionConfig}
						onNext={() => setCurrentStep("step2")}
					/>
				)}
				{currentStep === "step2" && (
					<Track1MilitaryStep
						gender={gender}
						hasMilitary={hasMilitary}
						setHasMilitary={setHasMilitary}
						militaryType={militaryType}
						setMilitaryType={setMilitaryType}
						enlistDate={enlistDate}
						setEnlistDate={setEnlistDate}
						dischargeDate={dischargeDate}
						setDischargeDate={setDischargeDate}
						militaryInfo={militaryInfo}
						ageInfo={ageInfo}
						needsMilDoc={ageInfo?.needsMilitaryDoc ?? false}
						onNext={() => setCurrentStep("step3")}
					/>
				)}
				{currentStep === "step3" && (
					<Step3Income
						employmentDate={employmentDate}
						targetYears={targetYears}
						employmentType={employmentType}
						incomeMode={incomeMode}
						setIncomeMode={setIncomeMode}
						incomeInputs={incomeInputs}
						updateIncomeInput={updateIncomeInput}
						onRun={handleRunSimulation}
						isCalculating={isCalculating}
						authStatus={authStatus}
						authError={authError}
						dataFetchStatus={dataFetchStatus}
						dataFetchError={dataFetchError}
						remainingSec={remainingSec}
						userName={userName}
						setUserName={setUserName}
						userMobile={userMobile}
						setUserMobile={setUserMobile}
						selectedProvider={selectedProvider}
						setSelectedProvider={setSelectedProvider}
						selectedTelecom={selectedTelecom}
						setSelectedTelecom={setSelectedTelecom}
						onStartAuth={handleStartAuth}
						onRequestTaxData={handleRequestTaxData}
					/>
				)}
				{currentStep === "collecting" && (
				<Track1CollectingStep
					targetYears={targetYears}
					dataFetchStatus={dataFetchStatus}
					dataFetchError={dataFetchError}
					onRetry={handleRequestTaxData}
					onComplete={handleCollectingComplete}
					onSwitchToManual={handleSwitchToManual}
				/>
			)}
			{currentStep === "result" && simulationResult && (
					<Track1ResultStep
						simulationResult={simulationResult}
						expandedYear={expandedYear}
						setExpandedYear={setExpandedYear}
						onConsultant={() =>
							navigation.navigate("TaxConsultantList", {
								from: "Track1YouthTax",
							})
						}
						onRestart={handleRestart}
						onGoHome={() => navigation.navigate("MainTab")}
						onHandoff={handleHandoff}
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

// ── Step 3 인라인 래퍼 ──
const Step3Income: React.FC<{
	employmentDate: string;
	targetYears: number[];
	employmentType: EmploymentType;
	incomeMode: "auto" | "manual";
	setIncomeMode: (v: "auto" | "manual") => void;
	incomeInputs: Record<number, IncomeInputRecord>;
	updateIncomeInput: (y: number, f: string, v: string | boolean) => void;
	onRun: () => void;
	isCalculating: boolean;
	authStatus: AuthStatus;
	authError: string | null;
	dataFetchStatus: DataFetchStatus;
	dataFetchError: string | null;
	remainingSec: number;
	userName: string;
	setUserName: (v: string) => void;
	userMobile: string;
	setUserMobile: (v: string) => void;
	selectedProvider: AuthProviderId;
	setSelectedProvider: (v: AuthProviderId) => void;
	selectedTelecom: string;
	setSelectedTelecom: (v: string) => void;
	onStartAuth: () => void;
	onRequestTaxData: () => void;
}> = (props) => (
	<View style={step3Styles.stepContent}>
		<Text style={step3Styles.stepLabel}>Step 3</Text>
		<Text style={step3Styles.stepTitle}>소득 자료 입력</Text>
		<Text style={step3Styles.stepSubtitle}>
			환급 금액 산출을 위한 연도별 소득 정보가 필요합니다{"\n"}
			원천징수영수증의 [73], [74], [77]번 항목을 입력해주세요
		</Text>
		<YearRangeCard targetYears={props.targetYears} />
		<ModeSelector incomeMode={props.incomeMode} setIncomeMode={props.setIncomeMode} />
		{props.incomeMode === "auto" ? (
			<AutoModeInfo
				authStatus={props.authStatus}
				authError={props.authError}
				dataFetchStatus={props.dataFetchStatus}
				dataFetchError={props.dataFetchError}
				remainingSec={props.remainingSec}
				userName={props.userName}
				setUserName={props.setUserName}
				userMobile={props.userMobile}
				setUserMobile={props.setUserMobile}
				selectedProvider={props.selectedProvider}
				setSelectedProvider={props.setSelectedProvider}
				selectedTelecom={props.selectedTelecom}
				setSelectedTelecom={props.setSelectedTelecom}
				onStartAuth={props.onStartAuth}
				onRequestTaxData={props.onRequestTaxData}
			/>
		) : (
			<ManualInputSection
				employmentDate={props.employmentDate}
				targetYears={props.targetYears}
				employmentType={props.employmentType}
				incomeInputs={props.incomeInputs}
				updateIncomeInput={props.updateIncomeInput}
			/>
		)}
		<DisclaimerBanner text="미입력 항목은 추정치로 시뮬레이션이 진행됩니다. 정확한 계산을 위해 원천징수영수증의 실제 값을 입력해주세요." />
		<TouchableOpacity
			style={[
				step3Styles.primaryButton,
				(props.targetYears.length === 0 || props.isCalculating) && step3Styles.primaryButtonDisabled,
			]}
			onPress={props.onRun}
			disabled={props.targetYears.length === 0 || props.isCalculating}
		>
			{props.isCalculating ? (
				<ActivityIndicator size="small" color={COLORS.white} />
			) : (
				<Ionicons name="calculator-outline" size={18} color={COLORS.white} />
			)}
			<Text style={step3Styles.primaryButtonText}>
				{props.isCalculating ? "계산 중..." : "시뮬레이션 결과 보기"}
			</Text>
		</TouchableOpacity>
	</View>
);

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	scroll: { paddingBottom: 60 },
});

export default Track1YouthTaxScreen;
