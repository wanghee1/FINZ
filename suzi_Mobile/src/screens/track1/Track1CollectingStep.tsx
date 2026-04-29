import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	Easing,
	Dimensions,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { DataFetchStatus } from "../../types";

const { width: SCREEN_W } = Dimensions.get("window");

// ── 수집 단계 정의 ──

interface CollectStage {
	id: string;
	label: string;
	subLabel: string;
	icon: keyof typeof Ionicons.glyphMap;
}

function buildStages(targetYears: number[]): CollectStage[] {
	const stages: CollectStage[] = [
		{
			id: "auth",
			label: "간편인증 완료",
			subLabel: "본인 확인이 완료되었습니다",
			icon: "shield-checkmark",
		},
		{
			id: "connect",
			label: "국세청 시스템 연결",
			subLabel: "보안 채널을 통해 연결 중입니다",
			icon: "cloud-outline",
		},
	];

	for (const year of targetYears) {
		stages.push({
			id: `year-${year}`,
			label: `${year}년 소득 데이터 수집`,
			subLabel: "근로소득 지급명세서 조회 중",
			icon: "document-text-outline",
		});
	}

	stages.push({
		id: "calc",
		label: "환급 금액 계산",
		subLabel: "경정청구 환급액을 산출하고 있습니다",
		icon: "calculator-outline",
	});
	stages.push({
		id: "done",
		label: "수집 완료!",
		subLabel: "모든 데이터가 준비되었습니다",
		icon: "checkmark-done-circle",
	});

	return stages;
}

// ── 동기부여 메시지 ──

const MOTIVATIONAL_MESSAGES = [
	{ text: "경정청구를 통해 평균 50~100만원의 환급을 받고 있습니다", icon: "cash-outline" as const },
	{ text: "근로소득 감면은 최대 5년간 소급 적용됩니다", icon: "time-outline" as const },
	{ text: "모든 데이터는 암호화되어 안전하게 처리됩니다", icon: "lock-closed-outline" as const },
	{ text: "청년 소득세 감면율은 최대 90%입니다", icon: "trending-up-outline" as const },
	{ text: "조회된 소득 데이터는 서버에 저장되지 않습니다", icon: "shield-outline" as const },
	{ text: "잠시만 기다려주세요, 거의 완료되었습니다", icon: "hourglass-outline" as const },
];

// ── 동기부여 메시지 컴포넌트 ──

const MotivationalBanner: React.FC = () => {
	const [msgIndex, setMsgIndex] = useState(0);
	const fadeAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const interval = setInterval(() => {
			// fade out
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start(() => {
				setMsgIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
				// fade in
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}).start();
			});
		}, 4000);

		return () => clearInterval(interval);
	}, []);

	const msg = MOTIVATIONAL_MESSAGES[msgIndex];

	return (
		<Animated.View style={[s.motivBanner, { opacity: fadeAnim }]}>
			<View style={s.motivIconWrap}>
				<Ionicons name={msg.icon} size={16} color={COLORS.teal600} />
			</View>
			<Text style={s.motivText}>{msg.text}</Text>
		</Animated.View>
	);
};

// ── 펄스 링 애니메이션 (헤더 아이콘) ──

const PulsingIcon: React.FC<{ isError: boolean; isDone: boolean }> = ({ isError, isDone }) => {
	const pulse1 = useRef(new Animated.Value(0)).current;
	const pulse2 = useRef(new Animated.Value(0)).current;
	const bounceAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (isDone) {
			// 완료 시 바운스
			Animated.spring(bounceAnim, {
				toValue: 1,
				friction: 3,
				tension: 200,
				useNativeDriver: true,
			}).start();
			return;
		}
		if (isError) return;

		// 펄스 링 2개 시차 반복
		const createPulse = (anim: Animated.Value, delay: number) =>
			Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(anim, {
						toValue: 1,
						duration: 2000,
						easing: Easing.out(Easing.cubic),
						useNativeDriver: true,
					}),
					Animated.timing(anim, {
						toValue: 0,
						duration: 0,
						useNativeDriver: true,
					}),
				]),
			);

		const p1 = createPulse(pulse1, 0);
		const p2 = createPulse(pulse2, 800);
		p1.start();
		p2.start();

		return () => {
			p1.stop();
			p2.stop();
		};
	}, [isError, isDone]);

	const renderRing = (anim: Animated.Value) => (
		<Animated.View
			style={[
				s.pulseRing,
				{
					opacity: anim.interpolate({
						inputRange: [0, 0.4, 1],
						outputRange: [0.6, 0.2, 0],
					}),
					transform: [
						{
							scale: anim.interpolate({
								inputRange: [0, 1],
								outputRange: [1, 2.2],
							}),
						},
					],
				},
			]}
		/>
	);

	const iconName = isDone
		? "checkmark-circle"
		: isError
		? "warning"
		: "search";

	const bgColor = isDone
		? COLORS.green600
		: isError
		? COLORS.orange600
		: COLORS.teal600;

	return (
		<View style={s.pulseContainer}>
			{!isError && !isDone && renderRing(pulse1)}
			{!isError && !isDone && renderRing(pulse2)}
			<Animated.View
				style={[
					s.headerIconWrap,
					{ backgroundColor: bgColor },
					isDone && {
						transform: [
							{
								scale: bounceAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [0.5, 1],
								}),
							},
						],
					},
				]}
			>
				<Ionicons name={iconName} size={30} color={COLORS.white} />
			</Animated.View>
		</View>
	);
};

// ── 커넥터 라인 (단계 사이 연결) ──

const ConnectorLine: React.FC<{ done: boolean }> = ({ done }) => {
	const fillAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (done) {
			Animated.timing(fillAnim, {
				toValue: 1,
				duration: 400,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false,
			}).start();
		}
	}, [done]);

	return (
		<View style={s.connectorWrap}>
			<View style={s.connectorTrack} />
			<Animated.View
				style={[
					s.connectorFill,
					{
						height: fillAnim.interpolate({
							inputRange: [0, 1],
							outputRange: ["0%", "100%"],
						}),
					},
				]}
			/>
		</View>
	);
};

// ── 개별 단계 행 ──

type StageStatus = "pending" | "active" | "done";

const StageRow: React.FC<{
	stage: CollectStage;
	status: StageStatus;
	index: number;
	isLast: boolean;
}> = ({ stage, status, index, isLast }) => {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const spinAnim = useRef(new Animated.Value(0)).current;
	const checkScale = useRef(new Animated.Value(0)).current;
	const glowAnim = useRef(new Animated.Value(0)).current;

	// 등장 애니메이션
	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 500,
				delay: index * 120,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				tension: 60,
				delay: index * 120,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	// Active 글로우 + 스피너
	useEffect(() => {
		if (status === "active") {
			const glow = Animated.loop(
				Animated.sequence([
					Animated.timing(glowAnim, {
						toValue: 1,
						duration: 1000,
						easing: Easing.inOut(Easing.sin),
						useNativeDriver: true,
					}),
					Animated.timing(glowAnim, {
						toValue: 0,
						duration: 1000,
						easing: Easing.inOut(Easing.sin),
						useNativeDriver: true,
					}),
				]),
			);
			glow.start();

			const spin = Animated.loop(
				Animated.timing(spinAnim, {
					toValue: 1,
					duration: 1000,
					easing: Easing.linear,
					useNativeDriver: true,
				}),
			);
			spin.start();

			return () => {
				glow.stop();
				spin.stop();
			};
		}
	}, [status]);

	// Done 체크 팝
	useEffect(() => {
		if (status === "done") {
			Animated.spring(checkScale, {
				toValue: 1,
				friction: 4,
				tension: 300,
				useNativeDriver: true,
			}).start();
		} else {
			checkScale.setValue(0);
		}
	}, [status]);

	const spinInterp = spinAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateX: slideAnim }],
			}}
		>
			<View
				style={[
					s.stageRow,
					status === "active" && s.stageRowActive,
					status === "done" && s.stageRowDone,
				]}
			>
				{/* 아이콘 */}
				<View style={s.stageIconWrap}>
					{status === "done" ? (
						<Animated.View
							style={[
								s.iconCircle,
								s.iconCircleDone,
								{ transform: [{ scale: checkScale }] },
							]}
						>
							<Ionicons name="checkmark" size={16} color={COLORS.white} />
						</Animated.View>
					) : status === "active" ? (
						<View style={s.activeIconOuter}>
							<Animated.View
								style={[
									s.activeGlow,
									{
										opacity: glowAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [0.3, 0.8],
										}),
										transform: [
											{
												scale: glowAnim.interpolate({
													inputRange: [0, 1],
													outputRange: [1, 1.4],
												}),
											},
										],
									},
								]}
							/>
							<Animated.View
								style={[
									s.iconCircle,
									s.iconCircleActive,
									{ transform: [{ rotate: spinInterp }] },
								]}
							>
								<View style={s.spinnerDot} />
							</Animated.View>
						</View>
					) : (
						<View style={[s.iconCircle, s.iconCirclePending]}>
							<View style={s.pendingDot} />
						</View>
					)}
				</View>

				{/* 라벨 */}
				<View style={s.stageLabelWrap}>
					<Text
						style={[
							s.stageLabel,
							status === "active" && s.stageLabelActive,
							status === "done" && s.stageLabelDone,
						]}
					>
						{stage.label}
					</Text>
					{status === "active" && (
						<Animated.Text
							style={[
								s.stageSub,
								{
									opacity: glowAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [0.6, 1],
									}),
								},
							]}
						>
							{stage.subLabel}
						</Animated.Text>
					)}
					{status === "done" && (
						<Text style={s.stageSubDone}>완료</Text>
					)}
				</View>

				{/* 오른쪽 아이콘 */}
				<View style={s.stageRightIcon}>
					<Ionicons
						name={stage.icon}
						size={18}
						color={
							status === "done"
								? COLORS.teal600
								: status === "active"
								? COLORS.blue600
								: COLORS.gray300
						}
					/>
				</View>
			</View>

			{/* 커넥터 라인 */}
			{!isLast && <ConnectorLine done={status === "done"} />}
		</Animated.View>
	);
};

// ── 프로그레스 바 (글로우 효과 포함) ──

const ProgressIndicator: React.FC<{
	current: number;
	total: number;
	isDone: boolean;
}> = ({ current, total, isDone }) => {
	const widthAnim = useRef(new Animated.Value(0)).current;
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(widthAnim, {
			toValue: current / total,
			duration: 800,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [current, total]);

	// 시머 효과
	useEffect(() => {
		if (isDone) return;
		const shimmer = Animated.loop(
			Animated.timing(shimmerAnim, {
				toValue: 1,
				duration: 1500,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		shimmer.start();
		return () => shimmer.stop();
	}, [isDone]);

	const pct = Math.round((current / total) * 100);

	return (
		<View style={s.progressWrap}>
			<View style={s.progressHeader}>
				<Text style={s.progressLabel}>수집 진행률</Text>
				<Text style={[s.progressPct, isDone && { color: COLORS.green600 }]}>
					{pct}%
				</Text>
			</View>
			<View style={s.progressTrack}>
				<Animated.View
					style={[
						s.progressFill,
						isDone && { backgroundColor: COLORS.green600 },
						{
							width: widthAnim.interpolate({
								inputRange: [0, 1],
								outputRange: ["0%", "100%"],
							}),
						},
					]}
				>
					{/* 시머 오버레이 */}
					{!isDone && (
						<Animated.View
							style={[
								s.shimmer,
								{
									transform: [
										{
											translateX: shimmerAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [-80, SCREEN_W],
											}),
										},
									],
								},
							]}
						/>
					)}
				</Animated.View>
			</View>
		</View>
	);
};

// ── 경과 시간 표시 ──

const ElapsedTimer: React.FC = () => {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
		return () => clearInterval(interval);
	}, []);

	const mm = Math.floor(elapsed / 60);
	const ss = elapsed % 60;

	return (
		<View style={s.timerWrap}>
			<Ionicons name="time-outline" size={14} color={COLORS.gray400} />
			<Text style={s.timerText}>
				경과 시간 {mm > 0 ? `${mm}분 ` : ""}{ss}초
			</Text>
		</View>
	);
};

// ── 메인 컴포넌트 ──

interface Track1CollectingStepProps {
	targetYears: number[];
	dataFetchStatus: DataFetchStatus;
	dataFetchError: string | null;
	onRetry: () => void;
	onComplete: () => void;
	onSwitchToManual: () => void;
}

const Track1CollectingStep: React.FC<Track1CollectingStepProps> = ({
	targetYears,
	dataFetchStatus,
	dataFetchError,
	onRetry,
	onComplete,
	onSwitchToManual,
}) => {
	const stages = useMemo(() => buildStages(targetYears), [targetYears]);
	const [activeIndex, setActiveIndex] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const completedRef = useRef(false);
	const [allDone, setAllDone] = useState(false);

	// 시뮬레이션된 진행 (연도당 ~3초)
	useEffect(() => {
		setActiveIndex(1); // 첫 번째 단계(인증완료)는 이미 done

		const estimatedPerStage = 3200;
		let currentIdx = 1;

		intervalRef.current = setInterval(() => {
			const maxSimulated = stages.length - 2; // 마지막 2개는 API 응답 후
			if (currentIdx < maxSimulated) {
				currentIdx += 1;
				setActiveIndex(currentIdx);
			}
		}, estimatedPerStage);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [stages.length]);

	// API 성공 → 남은 단계 빠르게 완료
	useEffect(() => {
		if (dataFetchStatus === "success" && !completedRef.current) {
			completedRef.current = true;
			if (intervalRef.current) clearInterval(intervalRef.current);

			let idx = activeIndex;
			const fastInterval = setInterval(() => {
				idx += 1;
				if (idx >= stages.length) {
					clearInterval(fastInterval);
					setAllDone(true);
					setTimeout(() => onComplete(), 1500);
				} else {
					setActiveIndex(idx);
				}
			}, 350);

			return () => clearInterval(fastInterval);
		}
	}, [dataFetchStatus]);

	// 에러 → 진행 중지
	useEffect(() => {
		if (dataFetchStatus === "error" || dataFetchStatus === "no_data") {
			if (intervalRef.current) clearInterval(intervalRef.current);
		}
	}, [dataFetchStatus]);

	// no_data → 3초 후 자동으로 수동 입력 전환
	useEffect(() => {
		if (dataFetchStatus === "no_data") {
			const timer = setTimeout(() => onSwitchToManual(), 3000);
			return () => clearTimeout(timer);
		}
	}, [dataFetchStatus, onSwitchToManual]);

	const isError = dataFetchStatus === "error" || dataFetchStatus === "no_data";

	return (
		<View style={s.container}>
			{/* ── 헤더 (펄스 아이콘 + 제목) ── */}
			<View style={s.header}>
				<PulsingIcon isError={isError} isDone={allDone} />

				<Text style={s.headerTitle}>
					{allDone
						? "데이터 수집 완료!"
						: isError
						? "데이터 수집 중 문제 발생"
						: "소득 데이터를 수집하고 있습니다"
					}
				</Text>
				<Text style={s.headerDesc}>
					{allDone
						? "환급 시뮬레이션 결과를 준비하고 있습니다..."
						: isError
						? (dataFetchError || "데이터 조회에 실패했습니다.")
						: "국세청 근로소득 지급명세서를 안전하게 조회 중입니다"
					}
				</Text>
			</View>

			{/* ── 프로그레스 바 ── */}
			{!isError && (
				<ProgressIndicator
					current={activeIndex}
					total={stages.length - 1}
					isDone={allDone}
				/>
			)}

			{/* ── 경과 시간 ── */}
			{!isError && !allDone && <ElapsedTimer />}

			{/* ── 단계 리스트 ── */}
			<View style={s.stageList}>
				{stages.map((stage, i) => {
					let status: StageStatus = "pending";
					if (i < activeIndex) status = "done";
					else if (i === activeIndex && !isError) status = "active";

					return (
						<StageRow
							key={stage.id}
							stage={stage}
							status={status}
							index={i}
							isLast={i === stages.length - 1}
						/>
					);
				})}
			</View>

			{/* ── 동기부여 메시지 ── */}
			{!isError && !allDone && <MotivationalBanner />}

			{/* ── 에러 액션 ── */}
			{dataFetchStatus === "error" && (
				<TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.8}>
					<Ionicons name="refresh-outline" size={20} color={COLORS.white} />
					<Text style={s.retryText}>다시 시도</Text>
				</TouchableOpacity>
			)}

			{dataFetchStatus === "no_data" && (
				<View style={s.noDataWrap}>
					<View style={s.noDataBanner}>
						<Ionicons name="information-circle" size={22} color={COLORS.orange600} />
						<View style={{ flex: 1 }}>
							<Text style={s.noDataTitle}>조회된 소득 데이터가 없습니다</Text>
							<Text style={s.noDataDesc}>
								국세청에 등록된 지급명세서가 없거나, 해당 기간에 근로소득이 없습니다.
							</Text>
						</View>
					</View>
					<Text style={s.noDataRedirect}>
						3초 후 수동 입력 화면으로 자동 이동합니다...
					</Text>
					<TouchableOpacity
						style={s.manualBtn}
						onPress={onSwitchToManual}
						activeOpacity={0.8}
					>
						<Ionicons name="create-outline" size={18} color={COLORS.white} />
						<Text style={s.manualBtnText}>수동 입력으로 바로 이동</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

// ── 스타일 ──

const s = StyleSheet.create({
	container: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
		paddingBottom: 40,
		gap: SPACING.lg,
	},
	// ── 헤더 ──
	header: {
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	pulseContainer: {
		width: 80,
		height: 80,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: SPACING.xs,
	},
	pulseRing: {
		position: "absolute",
		width: 64,
		height: 64,
		borderRadius: 32,
		borderWidth: 2,
		borderColor: COLORS.teal500,
	},
	headerIconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
		// shadow
		shadowColor: COLORS.teal600,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 8,
	},
	headerTitle: {
		fontSize: 21,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		letterSpacing: -0.3,
	},
	headerDesc: {
		fontSize: 14,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 21,
	},
	// ── 프로그레스 바 ──
	progressWrap: {
		gap: SPACING.sm,
		paddingHorizontal: SPACING.xs,
	},
	progressHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	progressLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray600,
	},
	progressPct: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.teal700,
		fontVariant: ["tabular-nums"],
	},
	progressTrack: {
		height: 10,
		backgroundColor: COLORS.gray100,
		borderRadius: 5,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: COLORS.teal600,
		borderRadius: 5,
		overflow: "hidden",
	},
	shimmer: {
		position: "absolute",
		top: 0,
		left: 0,
		width: 60,
		height: "100%",
		backgroundColor: "rgba(255,255,255,0.35)",
		borderRadius: 5,
	},
	// ── 경과 시간 ──
	timerWrap: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	timerText: {
		fontSize: 12,
		color: COLORS.gray400,
		fontVariant: ["tabular-nums"],
	},
	// ── 단계 리스트 ──
	stageList: {
		gap: 0,
	},
	stageRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.md,
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.gray100,
		gap: SPACING.md,
	},
	stageRowActive: { // 민트색으로 통일
		backgroundColor: COLORS.blue50,
		borderColor: COLORS.blue100,
		shadowColor: COLORS.blue500,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	stageRowDone: {
		backgroundColor: COLORS.teal50,
		borderColor: COLORS.teal100,
	},
	stageIconWrap: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	iconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	iconCircleDone: {
		backgroundColor: COLORS.teal600,
	},
	iconCircleActive: {
		borderWidth: 3,
		borderColor: COLORS.blue500,
		borderTopColor: "transparent",
	},
	iconCirclePending: {
		backgroundColor: COLORS.gray100,
	},
	activeIconOuter: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	activeGlow: {
		position: "absolute",
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.blue100,
	},
	spinnerDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: COLORS.blue500,
	},
	pendingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLORS.gray300,
	},
	stageLabelWrap: {
		flex: 1,
	},
	stageLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray400,
	},
	stageLabelActive: {
		color: COLORS.blue600,
		fontWeight: "700",
		fontSize: 15,
	},
	stageLabelDone: {
		color: COLORS.teal700,
		fontWeight: "600",
	},
	stageSub: {
		fontSize: 12,
		color: COLORS.blue500,
		marginTop: 2,
	},
	stageSubDone: {
		fontSize: 11,
		color: COLORS.teal500,
		marginTop: 1,
	},
	stageRightIcon: {
		width: 24,
		alignItems: "center",
	},
	// ── 커넥터 ──
	connectorWrap: {
		width: 32,
		height: 16,
		marginLeft: SPACING.lg,
		alignItems: "center",
	},
	connectorTrack: {
		position: "absolute",
		width: 2,
		height: "100%",
		backgroundColor: COLORS.gray200,
		borderRadius: 1,
	},
	connectorFill: {
		position: "absolute",
		width: 2,
		backgroundColor: COLORS.teal500,
		borderRadius: 1,
		top: 0,
	},
	// ── 동기부여 배너 ──
	motivBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.lg,
		backgroundColor: COLORS.teal50,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	motivIconWrap: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.white,
		alignItems: "center",
		justifyContent: "center",
	},
	motivText: {
		flex: 1,
		fontSize: 13,
		color: COLORS.teal700,
		lineHeight: 19,
		fontWeight: "600",
	},
	// ── 에러 / 재시도 ──
	retryBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		paddingVertical: 16,
		borderRadius: RADIUS.md,
		backgroundColor: COLORS.blue600,
		shadowColor: COLORS.blue600,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	retryText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
	// ── no_data ──
	noDataWrap: {
		gap: SPACING.md,
	},
	noDataBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: SPACING.md,
		padding: SPACING.lg,
		backgroundColor: COLORS.orange50,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.orange50,
	},
	noDataTitle: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.orange600,
		marginBottom: 4,
	},
	noDataDesc: {
		fontSize: 13,
		color: COLORS.gray600,
		lineHeight: 19,
	},
	noDataRedirect: {
		fontSize: 13,
		color: COLORS.gray400,
		textAlign: "center",
		fontStyle: "italic",
	},
	manualBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		paddingVertical: 16,
		borderRadius: RADIUS.md,
		backgroundColor: COLORS.gray800,
	},
	manualBtnText: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default Track1CollectingStep;
