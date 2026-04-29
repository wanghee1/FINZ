/**
 * Track2 결과 표시 스텝 — 6Way 세금 비교
 *
 * 6Way 비교 매트릭스 테이블, 비중과/중과 순위,
 * 리스크 델타, AI 의견, 액션 버튼
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { DISCLAIMER_TEXTS } from "../../constants";
import { formatKorean } from "../../utils/formatters";
import DisclaimerBanner from "../../components/DisclaimerBanner";
import PrimaryButton from "../../components/PrimaryButton";
import { SixWayResult, ScenarioResult } from "./types";

/** 중과유예 만료일 */
const SURCHARGE_DEADLINE = new Date(2026, 4, 9);

interface Track2ResultStepProps {
	result: SixWayResult;
	onRestart: () => void;
	onConsultant: () => void;
	onGoHome: () => void;
	isLoading?: boolean;
	simulationId?: string | null;
	aiSummary?: string | null;
	aiLoading?: boolean;
	onGenerateAiSummary?: () => void;
	onDeleteSimulation?: () => void;
	onSave?: () => void;
	onShare?: () => void;
	onPdf?: () => void;
}

// ── 시나리오 색상 ──────────────────────────────

const SCENARIO_COLORS: Record<number, string> = {
	1: COLORS.blue600,
	2: COLORS.blue600,
	3: COLORS.blue600,
	4: COLORS.blue600,
	5: COLORS.blue600,
	6: COLORS.blue600,
};

const Track2ResultStep: React.FC<Track2ResultStepProps> = ({
	result,
	onRestart,
	onConsultant,
	onGoHome,
	isLoading,
	simulationId,
	aiSummary,
	aiLoading,
	onGenerateAiSummary,
	onDeleteSimulation,
	onSave,
	onShare,
	onPdf,
}) => {
	const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

	const dDay = useMemo(() => {
		const now = new Date();
		const diff = SURCHARGE_DEADLINE.getTime() - now.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	}, []);

	const scenarios = result.scenarios;

	return (
		<View style={styles.stepContent}>
			<Text style={styles.resultTitle}>부동산 시뮬레이션 비교 결과</Text>
			<Text style={styles.resultSub}>6가지 시나리오별 비중과·중과 세금 비교</Text>

			{/* 서버 계산 진행 중 */}
			{isLoading && (
				<View style={styles.loadingBanner}>
					<ActivityIndicator size="small" color={COLORS.teal600} />
					<Text style={styles.loadingBannerText}>서버에서 정밀 계산 중...</Text>
				</View>
			)}

			{/* D-Day 배너 */}
			<View style={styles.dDayBanner}>
				<Ionicons name="alarm-outline" size={18} color={COLORS.red600} />
				<Text style={styles.dDayText}>중과 유예 종료까지 D-{dDay}</Text>
			</View>

			{/* 비중과/중과 용어 안내 */}
			<View style={styles.termExplain}>
				<View style={styles.termRow}>
					<View style={[styles.termDot, { backgroundColor: COLORS.green600 }]} />
					<Text style={styles.termText}>비중과 = 유예 기간 내 처분 시 세율 (더 낮음)</Text>
				</View>
				<View style={styles.termRow}>
					<View style={[styles.termDot, { backgroundColor: COLORS.red500 }]} />
					<Text style={styles.termText}>중과 = 유예 종료 후 처분 시 세율 (더 높음)</Text>
				</View>
			</View>

			{/* 면책 고지 */}
			<DisclaimerBanner text={DISCLAIMER_TEXTS.track2} type="warning" />

			{/* 최적 시나리오 하이라이트 */}
			<OptimalBanner result={result} scenarios={scenarios} />

			{/* 6Way 비교 카드 목록 */}
			{scenarios.map((s) => {
				const isOptimal = s.scenario_no === result.optimal_pre || s.scenario_no === result.optimal_post;
				const isExpanded = expandedScenario === s.scenario_no;
				return (
					<TouchableOpacity
						key={s.scenario_no}
						style={[styles.scenarioListCard, isOptimal && styles.scenarioListCardOptimal]}
						onPress={() => setExpandedScenario(isExpanded ? null : s.scenario_no)}
						activeOpacity={0.7}
					>
						{/* 상단: 번호 + 라벨 + 최적 배지 */}
						<View style={styles.scenarioListHeader}>
							<View style={styles.scenarioListNum}>
								<Text style={styles.scenarioListNumText}>{s.scenario_no}</Text>
							</View>
							<Text style={styles.scenarioListLabel} numberOfLines={1}>{s.label}</Text>
							{isOptimal && (
								<View style={styles.scenarioListBest}>
									<Ionicons name="trophy" size={12} color={COLORS.yellow500} />
									<Text style={styles.scenarioListBestText}>최적</Text>
								</View>
							)}
						</View>

						{/* 중간: 비중과 / 중과 / 차이 — 3열 그리드 */}
						<View style={styles.scenarioListGrid}>
							<View style={styles.scenarioListGridCol}>
								<Text style={styles.scenarioListGridLabel}>비중과</Text>
								<Text style={styles.scenarioListGridValue}>{formatKorean(s.pre_total)}</Text>
							</View>
							<View style={[styles.scenarioListGridCol, styles.scenarioListGridColMid]}>
								<Text style={styles.scenarioListGridLabel}>중과</Text>
								<Text style={[styles.scenarioListGridValue, { color: COLORS.gray900 }]}>{formatKorean(s.post_total)}</Text>
							</View>
							<View style={styles.scenarioListGridCol}>
								<Text style={styles.scenarioListGridLabel}>차이</Text>
								<Text style={[styles.scenarioListGridValue, { color: COLORS.red500 }]}>+{formatKorean(s.surcharge_increase)}</Text>
							</View>
						</View>

						{/* 상세 토글 힌트 */}
						<View style={styles.scenarioListToggle}>
							<Text style={styles.scenarioListToggleText}>{isExpanded ? "접기" : "세부 내역"}</Text>
							<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.blue600} />
						</View>

						{/* 상세 내역 (펼침) */}
						{isExpanded && <ScenarioDetail scenario={s} />}
					</TouchableOpacity>
				);
			})}

			{/* 리스크 델타 */}
			<RiskDeltaBox riskDelta={result.risk_delta} />

			{/* AI 의견 섹션 */}
			<AiSummarySection
				simulationId={simulationId}
				aiSummary={aiSummary}
				aiLoading={aiLoading}
				onGenerateAiSummary={onGenerateAiSummary}
			/>

			{/* 면책 고지 (통합) */}
			<View style={{ marginTop: SPACING.lg }}>
				<DisclaimerBanner text="본 결과는 참고용 시뮬레이션이며, 정확한 세무 판단은 세무사에게 문의하세요. FINZ는 세무 대리인이 아닙니다." type="warning" />
			</View>

			{/* 액션 버튼 */}
			<ActionButtons
				onRestart={onRestart}
				onConsultant={onConsultant}
				onDelete={onDeleteSimulation}
				hasSimulationId={!!simulationId}
				onPdf={onPdf}
				onShare={onShare}
			/>

			<PrimaryButton
				text="결과 저장하기"
				onPress={
					onSave ?? (() => Alert.alert("알림 (Not Available)", "결과 저장 기능이 아직 연결되지 않았습니다."))
				}
				iconLeft="bookmark-outline"
				color={COLORS.blue600}
			/>
			<PrimaryButton
				text="홈으로 돌아가기"
				onPress={onGoHome}
				iconLeft="home-outline"
				color={COLORS.gray500}
				variant="outline"
			/>
		</View>
	);
};

// ── 최적 시나리오 배너 ─────────────────────────

const OptimalBanner: React.FC<{
	result: SixWayResult;
	scenarios: ScenarioResult[];
}> = ({ result, scenarios }) => {
	const optPre = scenarios.find((s) => s.scenario_no === result.optimal_pre);
	const optPost = scenarios.find((s) => s.scenario_no === result.optimal_post);

	return (
		<View style={styles.optimalBanner}>
			<Text style={styles.optimalTitle}>세금 최소 시나리오</Text>
			<View style={styles.optimalRow}>
				<View style={styles.optimalItem}>
					<View style={[styles.optimalBadge, { backgroundColor: COLORS.green100 }]}>
						<Text style={[styles.optimalBadgeText, { color: COLORS.green600 }]}>비중과</Text>
					</View>
					<Text style={styles.optimalLabel}>{optPre ? `${optPre.scenario_no}. ${optPre.label}` : "-"}</Text>
					<Text style={styles.optimalAmount}>{optPre ? formatKorean(optPre.pre_total) : "-"}</Text>
				</View>
				<View style={styles.optimalDivider} />
				<View style={styles.optimalItem}>
					<View style={[styles.optimalBadge, { backgroundColor: COLORS.red100 }]}>
						<Text style={[styles.optimalBadgeText, { color: COLORS.red600 }]}>중과</Text>
					</View>
					<Text style={styles.optimalLabel}>
						{optPost ? `${optPost.scenario_no}. ${optPost.label}` : "-"}
					</Text>
					<Text style={styles.optimalAmount}>{optPost ? formatKorean(optPost.post_total) : "-"}</Text>
				</View>
			</View>
		</View>
	);
};

// ── 시나리오 카드 ─────────────────────────────

const ScenarioCard: React.FC<{
	scenario: ScenarioResult;
	isOptimalPre: boolean;
	isOptimalPost: boolean;
	rankPre: number;
	rankPost: number;
	isExpanded: boolean;
	onToggle: () => void;
}> = ({ scenario, isOptimalPre, isOptimalPost, rankPre, rankPost, isExpanded, onToggle }) => {
	const s = scenario;
	const color = SCENARIO_COLORS[s.scenario_no] || COLORS.gray600;

	return (
		<TouchableOpacity
			style={[styles.scenarioCard, (isOptimalPre || isOptimalPost) && styles.scenarioCardOptimal]}
			onPress={onToggle}
			activeOpacity={0.7}
		>
			{/* 헤더 */}
			<View style={styles.scenarioCardHeader}>
				<View style={styles.scenarioCardLeft}>
					<View style={[styles.scenarioKeyCircle, { backgroundColor: color + "15" }]}>
						<Text style={[styles.scenarioKeyText, { color }]}>{s.scenario_no}</Text>
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.scenarioCardLabel}>{s.label}</Text>
						<View style={styles.rankRow}>
							<Text style={styles.rankText}>비중과 {rankPre}위</Text>
							<Text style={styles.rankSep}>/</Text>
							<Text style={styles.rankText}>중과 {rankPost}위</Text>
						</View>
					</View>
				</View>
				{(isOptimalPre || isOptimalPost) && (
					<View style={styles.bestBadge}>
						<Ionicons name="trophy-outline" size={12} color={COLORS.yellow500} />
						<Text style={styles.bestBadgeText}>최적</Text>
					</View>
				)}
			</View>

			{/* 비중과/중과 요약 */}
			<View style={styles.taxSummaryRow}>
				<View style={styles.taxSummaryCol}>
					<Text style={styles.taxSummaryLabel}>비중과 합계</Text>
					<Text style={styles.taxSummaryValue}>{formatKorean(s.pre_total)}</Text>
				</View>
				<View style={styles.taxSummaryCol}>
					<Text style={styles.taxSummaryLabel}>중과 합계</Text>
					<Text style={[styles.taxSummaryValue, { color: COLORS.gray900 }]}>{formatKorean(s.post_total)}</Text>
				</View>
				<View style={styles.taxSummaryCol}>
					<Text style={styles.taxSummaryLabel}>중과 증가</Text>
					<Text style={[styles.taxSummaryValue, { color: COLORS.red500 }]}>
						+{formatKorean(s.surcharge_increase)}
					</Text>
				</View>
			</View>

			{/* 상세 토글 */}
			<TouchableOpacity style={styles.detailToggle} onPress={onToggle}>
				<Text style={styles.detailToggleText}>{isExpanded ? "세부 내역 접기" : "세부 내역 확인"}</Text>
				<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.teal600} />
			</TouchableOpacity>

			{/* 상세 내역 (펼침) */}
			{isExpanded && <ScenarioDetail scenario={s} />}
		</TouchableOpacity>
	);
};

// ── 시나리오 상세 내역 ────────────────────────

const ScenarioDetail: React.FC<{ scenario: ScenarioResult }> = ({ scenario: s }) => (
	<View style={styles.detailSection}>
		<View style={styles.detailHeader}>
			<Text style={styles.detailHeaderCell} />
			<Text style={styles.detailHeaderCell}>비중과</Text>
			<Text style={styles.detailHeaderCell}>중과</Text>
		</View>
		<DetailRow label="양도소득세" pre={s.pre_capital_gains_tax} post={s.post_capital_gains_tax} />
		<DetailRow label="증여세" pre={s.pre_gift_tax} post={s.post_gift_tax} />
		<DetailRow label="취득세" pre={s.pre_acquisition_tax} post={s.post_acquisition_tax} />
		<View style={styles.detailDivider} />
		<DetailRow label="합계" pre={s.pre_total} post={s.post_total} bold />
	</View>
);

const DetailRow: React.FC<{
	label: string;
	pre: number;
	post: number;
	bold?: boolean;
}> = ({ label, pre, post, bold }) => (
	<View style={dStyles.row}>
		<Text style={[dStyles.label, bold && dStyles.bold]}>{label}</Text>
		<Text style={[dStyles.value, bold && dStyles.bold]}>{formatKorean(pre)}</Text>
		<Text style={[dStyles.value, bold && dStyles.bold, { color: COLORS.red500 }]}>{formatKorean(post)}</Text>
	</View>
);

const dStyles = StyleSheet.create({
	row: {
		flexDirection: "row",
		paddingVertical: 5,
	},
	label: {
		fontSize: 13,
		color: COLORS.gray500,
		flex: 1,
	},
	value: {
		fontSize: 13,
		color: COLORS.gray800,
		fontWeight: "600",
		flex: 1,
		textAlign: "right",
	},
	bold: {
		fontWeight: "700",
		color: COLORS.gray900,
	},
});

// ── 리스크 델타 박스 ──────────────────────────

const RiskDeltaBox: React.FC<{ riskDelta: number }> = ({ riskDelta }) => (
	<View style={styles.riskDeltaBox}>
		<View style={styles.riskDeltaHeader}>
			<Ionicons name="warning-outline" size={18} color={COLORS.orange600} />
			<Text style={styles.riskDeltaTitle}>최대 세금 차이</Text>
		</View>
		<Text style={styles.riskDeltaValue}>{formatKorean(riskDelta)}</Text>
		<Text style={styles.riskDeltaDesc}>
			지금 처분하면 절약할 수 있는 최대 금액입니다.{"\n"}
			유예 기간(~2026.5.9) 내 처분 여부에 따라 이만큼 차이날 수 있습니다.
		</Text>
	</View>
);

// ── AI 의견 섹션 ──────────────────────────────

const AiSummarySection: React.FC<{
	simulationId?: string | null;
	aiSummary?: string | null;
	aiLoading?: boolean;
	onGenerateAiSummary?: () => void;
}> = ({ simulationId, aiSummary, aiLoading, onGenerateAiSummary }) => {
	if (!simulationId) return null;

	return (
		<View style={styles.aiSection}>
			<View style={styles.aiSectionHeader}>
				<Ionicons name="sparkles-outline" size={20} color={COLORS.purple600} />
				<Text style={styles.aiSectionTitle}>AI 의견</Text>
			</View>

			{aiSummary ? (
				<View style={styles.aiSummaryBox}>
					<Text style={styles.aiSummaryText}>{aiSummary}</Text>
					<View style={styles.aiDisclaimerRow}>
						<Ionicons name="information-circle-outline" size={14} color={COLORS.gray400} />
						<Text style={styles.aiDisclaimerText}>
							AI 의견은 참고용이며, 정확한 세무 판단은 세무사에게 문의하세요.
						</Text>
					</View>
				</View>
			) : aiLoading ? (
				<View style={styles.aiLoadingBox}>
					<ActivityIndicator size="small" color={COLORS.purple600} />
					<Text style={styles.aiLoadingText}>AI 의견 생성 중...</Text>
				</View>
			) : (
				<TouchableOpacity style={styles.aiGenerateBtn} onPress={onGenerateAiSummary} activeOpacity={0.7}>
					<Ionicons name="sparkles" size={18} color={COLORS.white} />
					<Text style={styles.aiGenerateBtnText}>AI 의견 생성하기</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

// ── 액션 버튼 ────────────────────────────────

const ActionButtons: React.FC<{
	onRestart: () => void;
	onConsultant: () => void;
	onDelete?: () => void;
	hasSimulationId: boolean;
	onPdf?: () => void;
	onShare?: () => void;
}> = ({ onRestart, onConsultant, onDelete, hasSimulationId, onPdf, onShare }) => (
	<View style={styles.actionRow}>
		<ActionBtn icon="refresh-outline" label="재계산" onPress={onRestart} />
		<ActionBtn icon="document-outline" label="PDF 저장" onPress={onPdf ?? (() => {})} />
		<ActionBtn icon="share-outline" label="공유" onPress={onShare ?? (() => {})} />
		<ActionBtn icon="chatbubble-ellipses-outline" label="세무사" onPress={onConsultant} />
		{hasSimulationId && onDelete && <ActionBtn icon="trash-outline" label="삭제" onPress={onDelete} />}
	</View>
);

const ActionBtn: React.FC<{
	icon: string;
	label: string;
	onPress: () => void;
}> = ({ icon, label, onPress }) => (
	<TouchableOpacity style={styles.actionBtn} onPress={onPress}>
		<Ionicons name={icon as any} size={20} color={COLORS.teal600} />
		<Text style={styles.actionBtnText}>{label}</Text>
	</TouchableOpacity>
);

// ── 스타일 ──────────────────────────────────

const styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.xxl,
	},
	resultTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xs,
	},
	resultSub: {
		fontSize: 14,
		color: COLORS.gray500,
		marginBottom: SPACING.lg,
	},
	// 로딩 배너
	loadingBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.blue50,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.md,
	},
	loadingBannerText: {
		fontSize: 13,
		color: COLORS.blue600,
		flex: 1,
	},
	// D-Day 배너
	dDayBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.red50,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.red100,
	},
	dDayText: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.red600,
	},
	// 최적 배너
	optimalBanner: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginTop: SPACING.md,
		marginBottom: SPACING.md,
	},
	optimalTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray700,
		marginBottom: SPACING.md,
	},
	optimalRow: {
		flexDirection: "row",
		gap: SPACING.md,
	},
	optimalItem: {
		flex: 1,
		alignItems: "center",
	},
	optimalDivider: {
		width: 1,
		backgroundColor: COLORS.gray200,
	},
	optimalBadge: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.full,
		marginBottom: SPACING.xs,
	},
	optimalBadgeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	optimalLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray700,
		textAlign: "center",
		marginBottom: 2,
	},
	optimalAmount: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	// 시나리오 카드
	scenarioCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginTop: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	scenarioCardOptimal: {
		borderColor: COLORS.blue500,
		borderWidth: 2,
	},
	scenarioCardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	scenarioCardLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		flex: 1,
	},
	scenarioKeyCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	scenarioKeyText: {
		fontSize: 16,
		fontWeight: "700",
	},
	scenarioCardLabel: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	rankRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 2,
	},
	rankText: {
		fontSize: 11,
		color: COLORS.gray400,
		fontWeight: "600",
	},
	rankSep: {
		fontSize: 11,
		color: COLORS.gray300,
		marginHorizontal: 4,
	},
	bestBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		backgroundColor: COLORS.yellow50,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: RADIUS.full,
	},
	bestBadgeText: {
		fontSize: 11,
		fontWeight: "700",
		color: COLORS.yellow500,
	},
	// 세금 요약 행
	taxSummaryRow: {
		flexDirection: "row",
		marginTop: SPACING.md,
		gap: SPACING.xs,
	},
	taxSummaryCol: {
		flex: 1,
		alignItems: "center",
		backgroundColor: COLORS.gray50,
		padding: SPACING.sm,
		borderRadius: RADIUS.sm,
	},
	taxSummaryLabel: {
		fontSize: 10,
		color: COLORS.gray400,
		fontWeight: "600",
		marginBottom: 2,
	},
	taxSummaryValue: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	// 상세 토글
	detailToggle: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		marginTop: SPACING.md,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},
	detailToggleText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.blue600,
	},
	detailSection: {
		marginTop: SPACING.md,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},
	detailHeader: {
		flexDirection: "row",
		paddingBottom: 4,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray100,
		marginBottom: 4,
	},
	detailHeaderCell: {
		flex: 1,
		fontSize: 11,
		fontWeight: "700",
		color: COLORS.gray400,
		textAlign: "right",
	},
	detailDivider: {
		height: 1,
		backgroundColor: COLORS.gray100,
		marginVertical: 4,
	},
	// 리스크 델타
	riskDeltaBox: {
		backgroundColor: COLORS.orange50,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginTop: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.orange50,
	},
	riskDeltaHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	riskDeltaTitle: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.orange600,
	},
	riskDeltaValue: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.orange600,
		marginBottom: SPACING.sm,
	},
	riskDeltaDesc: {
		fontSize: 12,
		color: COLORS.gray500,
		lineHeight: 18,
	},
	// AI 의견 섹션
	aiSection: {
		marginTop: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.purple100,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		backgroundColor: COLORS.purple50,
	},
	aiSectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.md,
	},
	aiSectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.purple600,
	},
	aiSummaryBox: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
	},
	aiSummaryText: {
		fontSize: 14,
		color: COLORS.gray800,
		lineHeight: 22,
	},
	aiDisclaimerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 4,
		marginTop: SPACING.md,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},
	aiDisclaimerText: {
		fontSize: 11,
		color: COLORS.gray400,
		flex: 1,
		lineHeight: 16,
	},
	aiLoadingBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.lg,
	},
	aiLoadingText: {
		fontSize: 14,
		color: COLORS.purple600,
	},
	aiGenerateBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.purple600,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
	},
	aiGenerateBtnText: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.white,
	},
	// 액션 버튼
	actionRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: SPACING.xxl,
		marginBottom: SPACING.lg,
	},
	actionBtn: {
		alignItems: "center",
		gap: SPACING.xs,
		padding: SPACING.md,
	},
	actionBtnText: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.blue600,
	},
	// 시나리오 카드 목록
	scenarioListCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	scenarioListCardOptimal: {
		borderColor: COLORS.blue500,
		borderWidth: 2,
		backgroundColor: COLORS.blue50,
	},
	scenarioListHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.md,
	},
	scenarioListNum: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.blue50,
		justifyContent: "center",
		alignItems: "center",
	},
	scenarioListNumText: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.blue600,
	},
	scenarioListLabel: {
		flex: 1,
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	scenarioListBest: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		backgroundColor: COLORS.yellow50,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 3,
		borderRadius: RADIUS.full,
	},
	scenarioListBestText: {
		fontSize: 11,
		fontWeight: "700",
		color: COLORS.yellow500,
	},
	scenarioListGrid: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	scenarioListGridCol: {
		flex: 1,
		alignItems: "center",
		backgroundColor: COLORS.gray50,
		paddingVertical: SPACING.sm,
		paddingHorizontal: SPACING.xs,
		borderRadius: RADIUS.sm,
	},
	scenarioListGridColMid: {
		borderLeftWidth: 0,
		borderRightWidth: 0,
	},
	scenarioListGridLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: COLORS.gray400,
		marginBottom: 3,
	},
	scenarioListGridValue: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	scenarioListToggle: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},
	scenarioListToggleText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.blue600,
	},
	// 비중과/중과 용어 안내
	termExplain: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.md,
		marginBottom: SPACING.md,
		gap: SPACING.xs,
	},
	termRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
	},
	termDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	termText: {
		fontSize: 13,
		color: COLORS.gray600,
	},
});

export default Track2ResultStep;
