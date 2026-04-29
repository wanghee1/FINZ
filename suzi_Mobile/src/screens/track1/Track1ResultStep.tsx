import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { INELIGIBLE_REASON_LABELS } from "../../constants";
import DisclaimerBanner from "../../components/DisclaimerBanner";
import PrimaryButton from "../../components/PrimaryButton";
import { YouthTaxResult, YearlyRefundDetail } from "../../types";
import { formatCurrency } from "../../utils/formatters";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface Track1ResultStepProps {
	simulationResult: YouthTaxResult;
	expandedYear: number | null;
	setExpandedYear: (year: number | null) => void;
	onConsultant: () => void;
	onRestart: () => void;
	onGoHome: () => void;
	onHandoff?: (contactName: string, contactPhone: string, contactEmail?: string, memo?: string) => Promise<any>;
	onSave?: () => void;
	onShare?: () => void;
	onPdf?: () => void;
}

// ──────────────────────────────────────────
// 대상 판정 요약 (v2.3: 세법상 나이 + 유형)
// ──────────────────────────────────────────

const EligibilitySection: React.FC<{
	result: YouthTaxResult;
}> = ({ result }) => {
	const { eligibility } = result;
	const typeLabel =
		eligibility.employmentType === "YOUTH"
			? "청년 소득세 감면"
			: eligibility.employmentType === "SENIOR"
				? "고령자 소득세 감면"
				: "-";

	return (
		<View style={styles.eligibilitySection}>
			<View style={styles.eligibilityHeader}>
				<Ionicons
					name={eligibility.isEligible ? "checkmark-circle" : "close-circle"}
					size={24}
					color={eligibility.isEligible ? COLORS.green600 : COLORS.red500}
				/>
				<Text
					style={[
						styles.eligibilityTitle,
						{ color: eligibility.isEligible ? COLORS.green600 : COLORS.red500 },
					]}
				>
					{eligibility.isEligible ? typeLabel + " 대상입니다" : "감면 대상이 아닙니다"}
				</Text>
			</View>

			<View style={styles.eligibilityGrid}>
				<EligibilityRow label="감면 유형" value={typeLabel} />
				<EligibilityRow label="취업 시점 나이" value={renderAgeValue(eligibility)} />
				<EligibilityRow
					label="중소기업 판정"
					value={eligibility.isSme ? "중소기업" : "비중소기업"}
					valueColor={eligibility.isSme ? COLORS.green600 : COLORS.red500}
				/>
				<EligibilityRow
					label="감면 적용 기간"
					value={`${eligibility.reductionPeriodStart}년 ~ ${eligibility.reductionPeriodEnd}년`}
				/>
				<EligibilityRow
					label="적용 감면율"
					value={`${(eligibility.reductionRate * 100).toFixed(0)}%`}
					valueColor={COLORS.teal600}
				/>
			</View>

			{!eligibility.isEligible && <IneligibleReasons reasons={eligibility.ineligibleReasons} />}
		</View>
	);
};

const EligibilityRow: React.FC<{
	label: string;
	value: string;
	valueColor?: string;
}> = ({ label, value, valueColor }) => (
	<View style={styles.eligibilityItem}>
		<Text style={styles.eligibilityLabel}>{label}</Text>
		<Text style={[styles.eligibilityValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
	</View>
);

const renderAgeValue = (eligibility: YouthTaxResult["eligibility"]): string => {
	let text = `만 ${eligibility.ageAtEmployment}세`;
	if (eligibility.hasMilitaryDeduction) {
		text += ` (세법상 ${eligibility.taxAge.toFixed(1)}세)`;
	}
	return text;
};

const IneligibleReasons: React.FC<{
	reasons: YouthTaxResult["eligibility"]["ineligibleReasons"];
}> = ({ reasons }) => (
	<View style={styles.ineligibleSection}>
		{reasons.map((reason, i) => (
			<View key={i} style={styles.ineligibleRow}>
				<Ionicons name="alert-circle" size={16} color={COLORS.red500} />
				<View style={{ flex: 1, marginLeft: SPACING.sm }}>
					<Text style={styles.ineligibleCode}>{INELIGIBLE_REASON_LABELS[reason.code] || reason.code}</Text>
					<Text style={styles.ineligibleDetail}>{reason.detail}</Text>
				</View>
			</View>
		))}
	</View>
);

// ──────────────────────────────────────────
// 총 환급 예상액 하이라이트 (v2.3)
// ──────────────────────────────────────────

const RefundHighlight: React.FC<{
	result: YouthTaxResult;
}> = ({ result }) => {
	const yearCount = result.yearlyDetails.filter((d) => d.totalRefund > 0).length;

	return (
		<View style={styles.resultHighlight}>
			<Text style={styles.resultLabel}>총 환급 예상액</Text>
			<Text style={styles.resultAmount}>{formatCurrency(result.totalRefundEstimate)}</Text>
			<View style={styles.resultBreakdown}>
				<View style={styles.resultBreakdownItem}>
					<Text style={styles.resultBreakdownLabel}>소득세</Text>
					<Text style={styles.resultBreakdownValue}>{formatCurrency(result.totalRefundIncomeTax)}</Text>
				</View>
				<View style={styles.resultBreakdownDivider} />
				<View style={styles.resultBreakdownItem}>
					<Text style={styles.resultBreakdownLabel}>지방소득세</Text>
					<Text style={styles.resultBreakdownValue}>{formatCurrency(result.totalRefundLocalTax)}</Text>
				</View>
			</View>
			<Text style={styles.resultSub}>{yearCount}개 연도 합산</Text>
		</View>
	);
};

// ──────────────────────────────────────────
// 수수료 안내 카드 (v2.3 신규)
// ──────────────────────────────────────────

const FeeEstimateCard: React.FC<{
	result: YouthTaxResult;
}> = ({ result }) => {
	const { feeEstimate } = result;
	if (feeEstimate.refundAmount <= 0) return null;

	const rateText = (feeEstimate.feeRate * 100).toFixed(0);

	return (
		<View style={styles.feeCard}>
			<View style={styles.feeCardHeader}>
				<Ionicons name="receipt-outline" size={18} color={COLORS.teal700} />
				<Text style={styles.feeCardTitle}>예상 수수료 안내</Text>
			</View>
			<View style={styles.feeRow}>
				<Text style={styles.feeLabel}>환급 예상액</Text>
				<Text style={styles.feeValue}>{formatCurrency(feeEstimate.refundAmount)}</Text>
			</View>
			<View style={styles.feeRow}>
				<Text style={styles.feeLabel}>성과보수 ({rateText}%)</Text>
				<Text style={[styles.feeValue, { color: COLORS.gray500 }]}>
					-{formatCurrency(feeEstimate.taxAgentFee)}
				</Text>
			</View>
			<View style={styles.feeDivider} />
			<View style={styles.feeRow}>
				<Text style={[styles.feeLabel, { fontWeight: "700", color: COLORS.gray900 }]}>고객 예상 실수령액</Text>
				<Text style={[styles.feeValue, { fontWeight: "700", color: COLORS.teal600, fontSize: 18 }]}>
					{formatCurrency(feeEstimate.customerNet)}
				</Text>
			</View>
			<Text style={styles.feeNotice}>성공 시에만 청구 · 환급 불성립 시 비용 0원</Text>
		</View>
	);
};

// ──────────────────────────────────────────
// 연도 구분 안내
// ──────────────────────────────────────────

const ClaimTypeGuide: React.FC<{
	result: YouthTaxResult;
}> = ({ result }) => {
	if (result.currentYears.length === 0 && result.claimableAmendmentYears.length === 0) return null;

	return (
		<View style={styles.claimTypeGuide}>
			{result.currentYears.length > 0 && (
				<View style={styles.claimTypeItem}>
					<View style={[styles.claimTypeDot, { backgroundColor: COLORS.teal600 }]} />
					<Text style={styles.claimTypeLabel}>현재 연도 ({result.currentYears.join(", ")}년)</Text>
					<Text style={styles.claimTypeDesc}>회사를 통한 신청</Text>
				</View>
			)}
			{result.claimableAmendmentYears.length > 0 && (
				<View style={styles.claimTypeItem}>
					<View style={[styles.claimTypeDot, { backgroundColor: COLORS.blue600 }]} />
					<Text style={styles.claimTypeLabel}>과거 연도 ({result.claimableAmendmentYears.join(", ")}년)</Text>
					<Text style={styles.claimTypeDesc}>경정청구 대상</Text>
				</View>
			)}
		</View>
	);
};

// ──────────────────────────────────────────
// 연도별 상세 카드 (v2.3: 세액공제 재조정 표시)
// ──────────────────────────────────────────

const YearDetailCard: React.FC<{
	detail: YearlyRefundDetail;
	isExpanded: boolean;
	onToggle: () => void;
}> = ({ detail, isExpanded, onToggle }) => (
	<TouchableOpacity
		style={[styles.yearCard, detail.totalRefund === 0 && styles.yearCardDisabled]}
		onPress={onToggle}
		activeOpacity={0.7}
	>
		<YearCardHeader detail={detail} isExpanded={isExpanded} />
		{isExpanded && <YearCardBody detail={detail} />}
	</TouchableOpacity>
);

const YearCardHeader: React.FC<{
	detail: YearlyRefundDetail;
	isExpanded: boolean;
}> = ({ detail, isExpanded }) => {
	const r = detail;

	return (
		<View style={styles.yearCardHeader}>
			<View style={styles.yearCardLeft}>
				<Text style={styles.yearCardYear}>{r.year}년</Text>
				<View
					style={[
						styles.yearTypeBadge,
						r.type === "COMPANY" ? { backgroundColor: COLORS.teal50 } : { backgroundColor: COLORS.teal50 },
					]}
				>
					<Text
						style={[
							styles.yearTypeText,
							r.type === "COMPANY" ? { color: COLORS.teal600 } : { color: COLORS.teal600 },
						]}
					>
						{r.type === "COMPANY" ? "회사 신청" : "경정청구"}
					</Text>
				</View>
				{r.deadlineDate && r.type === "AMENDMENT" && (
					<Text style={styles.deadlineText}>{r.deadlineDate} 마감</Text>
				)}
			</View>
			<View style={styles.yearCardRight}>
				<Text style={[styles.yearCardRefund, r.totalRefund === 0 && { color: COLORS.gray400 }]}>
					{r.totalRefund > 0 ? `+${formatCurrency(r.totalRefund)}` : "환급 없음"}
				</Text>
				<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.gray400} />
			</View>
		</View>
	);
};

const YearCardBody: React.FC<{
	detail: YearlyRefundDetail;
}> = ({ detail }) => {
	const r = detail;
	const capText = r.annualCap > 99999999 ? "한도 없음" : formatCurrency(r.annualCap);

	return (
		<View style={styles.yearCardDetail}>
			<Text style={styles.sectionLabel}>원래 신고 (감면 미적용)</Text>
			<DetailRow label="총급여" value={formatCurrency(r.totalSalary)} />
			<DetailRow label="내야 할 세금 (원래)" value={formatCurrency(r.calculatedTax)} />
			<DetailRow label="감면 전 세금 공제" value={formatCurrency(r.wageTaxCreditBefore)} />
			<DetailRow label="당초 납부 세금" value={formatCurrency(r.originalFinalTax)} />

			<View style={styles.divider} />

			<Text style={styles.sectionLabel}>감면 적용 후 재계산</Text>
			<DetailRow
				label={`감면율 ${r.reductionRate}% 적용`}
				value={formatCurrency(r.rawReduction)}
				valueStyle={{ color: COLORS.teal600 }}
			/>
			<DetailRow
				label={`연간 한도 적용 (${capText})`}
				value={formatCurrency(r.reductionAmount)}
				valueStyle={{ color: COLORS.teal600, fontWeight: "700" }}
			/>
			<DetailRow
				label="감면 후 세금 공제 (재계산)"
				value={formatCurrency(r.wageTaxCreditAfter)}
				labelStyle={{ color: COLORS.orange600 }}
				valueStyle={{ color: COLORS.orange600 }}
			/>
			<DetailRow
				label="정정 후 납부 세금"
				value={formatCurrency(r.correctedFinalTax)}
				labelStyle={{ fontWeight: "700" }}
				valueStyle={{ fontWeight: "700" }}
			/>

			<View style={[styles.divider, { backgroundColor: COLORS.teal100 }]} />

			<Text style={styles.sectionLabel}>환급액 산출</Text>
			<DetailRow
				label="당초 결정세액 − 정정 결정세액"
				value=""
				labelStyle={{ fontSize: 11, color: COLORS.gray400 }}
			/>
			<DetailRow
				label="환급 소득세"
				value={`+${formatCurrency(r.refundAmount)}`}
				labelStyle={{ fontWeight: "700" }}
				valueStyle={{ color: COLORS.teal600, fontWeight: "700" }}
			/>
			<DetailRow
				label="환급 지방소득세 (10%)"
				value={`+${formatCurrency(r.refundLocalTax)}`}
				labelStyle={{ fontWeight: "700" }}
				valueStyle={{ color: COLORS.teal600, fontWeight: "700" }}
			/>

			<View style={[styles.divider, { backgroundColor: COLORS.teal100 }]} />

			<DetailRow
				label="연도 총 환급 예상액"
				value={`+${formatCurrency(r.totalRefund)}`}
				labelStyle={{ fontWeight: "700", color: COLORS.gray900 }}
				valueStyle={{ color: COLORS.teal600, fontWeight: "700", fontSize: 16 }}
			/>

			{r.ineligibleReasons.length > 0 && <YearIneligibleBox reasons={r.ineligibleReasons} />}
		</View>
	);
};

const DetailRow: React.FC<{
	label: string;
	value: string;
	labelStyle?: object;
	valueStyle?: object;
}> = ({ label, value, labelStyle, valueStyle }) => (
	<View style={styles.detailRow}>
		<Text style={[styles.detailRowLabel, labelStyle]}>{label}</Text>
		<Text style={[styles.detailRowValue, valueStyle]}>{value}</Text>
	</View>
);

const YearIneligibleBox: React.FC<{
	reasons: YearlyRefundDetail["ineligibleReasons"];
}> = ({ reasons }) => (
	<View style={styles.yearIneligibleBox}>
		{reasons.map((reason, idx) => (
			<View key={idx} style={styles.yearIneligibleRow}>
				<Ionicons name="information-circle" size={14} color={COLORS.orange600} />
				<Text style={styles.yearIneligibleText}>{reason.detail}</Text>
			</View>
		))}
	</View>
);

// ──────────────────────────────────────────
// 세무법인 의뢰 섹션 (v2.3 — API 연동)
// ──────────────────────────────────────────

const TaxFirmSection: React.FC<{
	onConsultant: () => void;
	onHandoff?: (contactName: string, contactPhone: string, contactEmail?: string, memo?: string) => Promise<any>;
}> = ({ onConsultant, onHandoff }) => {
	const [showHandoffForm, setShowHandoffForm] = useState(false);
	const [contactName, setContactName] = useState("");
	const [contactPhone, setContactPhone] = useState("");
	const [contactEmail, setContactEmail] = useState("");
	const [memo, setMemo] = useState("");
	const [consentPrivacy, setConsentPrivacy] = useState(false);
	const [consentPartner, setConsentPartner] = useState(false);
	const [handoffLoading, setHandoffLoading] = useState(false);
	const [handoffDone, setHandoffDone] = useState(false);

	const handleSubmitHandoff = async () => {
		if (!contactName.trim()) {
			Alert.alert("알림", "이름을 입력해주세요.");
			return;
		}
		if (!contactPhone.trim()) {
			Alert.alert("알림", "연락처를 입력해주세요.");
			return;
		}
		if (!consentPrivacy || !consentPartner) {
			Alert.alert("알림", "필수 동의 항목에 모두 체크해주세요.");
			return;
		}
		if (!onHandoff) {
			onConsultant();
			return;
		}

		setHandoffLoading(true);
		try {
			const result = await onHandoff(
				contactName.trim(),
				contactPhone.trim(),
				contactEmail.trim() || undefined,
				memo.trim() || undefined,
			);
			if (result) {
				setHandoffDone(true);
			}
		} finally {
			setHandoffLoading(false);
		}
	};

	if (handoffDone) {
		return (
			<View style={[styles.taxFirmSection, { backgroundColor: COLORS.green100, borderColor: COLORS.green100 }]}>
				<View style={{ alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.lg }}>
					<Ionicons name="checkmark-circle" size={48} color={COLORS.orange600} />
					<Text style={[styles.taxFirmTitle, { color: COLORS.green600, textAlign: "center" }]}>
						세무법인 인계가 완료되었습니다
					</Text>
					<Text style={{ fontSize: 13, color: COLORS.gray600, textAlign: "center", lineHeight: 20 }}>
						담당 세무사가 입력하신 연락처로{"\n"}
						영업일 기준 1~2일 내 연락드릴 예정입니다.
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.taxFirmSection}>
			<View style={styles.taxFirmHeader}>
				<Text style={styles.taxFirmTitle}>전문 세무법인이 경정청구를 진행합니다</Text>
				<Text style={styles.taxFirmSubtitle}>
					담당 세무법인\n광교세무법인 강남센터{"\n"}
					\n김혜진 세무사 (경력 20년)
				</Text>
			</View>

			<View style={styles.taxFirmBenefits}>
				<View style={styles.benefitRow}>
					<Ionicons name="checkmark-circle" size={16} color={COLORS.orange600} />
					<Text style={styles.benefitText}>성공 시에만 수수료 (환급액의 10~20%)</Text>
				</View>
				<View style={styles.benefitRow}>
					<Ionicons name="checkmark-circle" size={16} color={COLORS.orange600} />
					<Text style={styles.benefitText}>환급 불성립 시 비용 0원</Text>
				</View>
				<View style={styles.benefitRow}>
					<Ionicons name="checkmark-circle" size={16} color={COLORS.orange600} />
					<Text style={styles.benefitText}>환급금은 고객 계좌 직접 입금</Text>
				</View>
			</View>

			{!showHandoffForm ? (
				<TouchableOpacity style={styles.consultantButton} onPress={() => setShowHandoffForm(true)}>
					<Ionicons name="business-outline" size={18} color={COLORS.white} />
					<Text style={styles.consultantButtonText}>세무법인에 의뢰하기</Text>
				</TouchableOpacity>
			) : (
				<View style={styles.handoffForm}>
					<Text style={styles.handoffFormTitle}>인계 정보 입력</Text>

					<View style={styles.handoffField}>
						<Text style={styles.handoffLabel}>이름 *</Text>
						<TextInput
							style={styles.handoffInput}
							placeholder="홍길동"
							placeholderTextColor={COLORS.gray300}
							value={contactName}
							onChangeText={setContactName}
						/>
					</View>

					<View style={styles.handoffField}>
						<Text style={styles.handoffLabel}>연락처 *</Text>
						<TextInput
							style={styles.handoffInput}
							placeholder="010-1234-5678"
							placeholderTextColor={COLORS.gray300}
							keyboardType="phone-pad"
							value={contactPhone}
							onChangeText={setContactPhone}
						/>
					</View>

					<View style={styles.handoffField}>
						<Text style={styles.handoffLabel}>이메일 (선택)</Text>
						<TextInput
							style={styles.handoffInput}
							placeholder="email@example.com"
							placeholderTextColor={COLORS.gray300}
							keyboardType="email-address"
							autoCapitalize="none"
							value={contactEmail}
							onChangeText={setContactEmail}
						/>
					</View>

					<View style={styles.handoffField}>
						<Text style={styles.handoffLabel}>메모 (선택)</Text>
						<TextInput
							style={[styles.handoffInput, { height: 60, textAlignVertical: "top" }]}
							placeholder="세무사에게 전달할 메모"
							placeholderTextColor={COLORS.gray300}
							multiline
							value={memo}
							onChangeText={setMemo}
						/>
					</View>

					{/* 동의 체크 */}
					<TouchableOpacity style={styles.consentRow} onPress={() => setConsentPrivacy(!consentPrivacy)}>
						<Ionicons
							name={consentPrivacy ? "checkbox" : "square-outline"}
							size={20}
							color={consentPrivacy ? COLORS.teal600 : COLORS.gray400}
						/>
						<Text style={styles.consentText}>[필수] 개인정보 수집 및 이용 동의</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.consentRow} onPress={() => setConsentPartner(!consentPartner)}>
						<Ionicons
							name={consentPartner ? "checkbox" : "square-outline"}
							size={20}
							color={consentPartner ? COLORS.teal600 : COLORS.gray400}
						/>
						<Text style={styles.consentText}>[필수] 세무법인 정보 제공 동의</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.consultantButton, handoffLoading && { opacity: 0.7 }]}
						onPress={handleSubmitHandoff}
						disabled={handoffLoading}
					>
						{handoffLoading ? (
							<ActivityIndicator size="small" color={COLORS.white} />
						) : (
							<Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
						)}
						<Text style={styles.consultantButtonText}>
							{handoffLoading ? "인계 요청 중..." : "인계 요청하기"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.cancelHandoffButton} onPress={() => setShowHandoffForm(false)}>
						<Text style={styles.cancelHandoffText}>취소</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

// ──────────────────────────────────────────
// 액션 버튼 영역
// ──────────────────────────────────────────

const ActionButtons: React.FC<{
	onRestart: () => void;
	onGoHome: () => void;
	onSave?: () => void;
	onShare?: () => void;
	onPdf?: () => void;
}> = ({ onRestart, onGoHome, onSave, onShare, onPdf }) => (
	<>
		<View style={styles.actionRow}>
			<TouchableOpacity style={styles.actionButton} onPress={onPdf} accessibilityLabel="PDF 저장">
				<Ionicons name="document-outline" size={20} color={COLORS.teal600} />
				<Text style={styles.actionButtonText}>PDF 저장</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.actionButton} onPress={onShare} accessibilityLabel="결과 공유">
				<Ionicons name="share-outline" size={20} color={COLORS.teal600} />
				<Text style={styles.actionButtonText}>공유</Text>
			</TouchableOpacity>
		</View>

		<PrimaryButton
			text="결과 저장하기"
			onPress={onSave ?? (() => {})}
			iconLeft="bookmark-outline"
			color={COLORS.teal600}
		/>
		<View style={{ height: SPACING.sm }} />
		<PrimaryButton
			text="다시 시뮬레이션하기"
			onPress={onRestart}
			iconLeft="refresh-outline"
			color={COLORS.teal600}
			variant="outline"
		/>
		<View style={{ height: SPACING.sm }} />
		<PrimaryButton
			text="홈으로 돌아가기"
			onPress={onGoHome}
			iconLeft="home-outline"
			color={COLORS.gray500}
			variant="outline"
		/>
	</>
);

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────

const Track1ResultStep: React.FC<Track1ResultStepProps> = ({
	simulationResult,
	expandedYear,
	setExpandedYear,
	onConsultant,
	onRestart,
	onGoHome,
	onHandoff,
	onSave,
	onShare,
	onPdf,
}) => {
	const [showFullDetail, setShowFullDetail] = useState(false);

	return (
		<View style={styles.stepContent}>
			<EligibilitySection result={simulationResult} />

			{simulationResult.eligibility.isEligible && (
				<>
					<RefundHighlight result={simulationResult} />
					<FeeEstimateCard result={simulationResult} />
					<ClaimTypeGuide result={simulationResult} />

					{/* 상세 보기 토글 */}
					{!showFullDetail ? (
						<TouchableOpacity
							style={styles.detailToggleButton}
							onPress={() => setShowFullDetail(true)}
							activeOpacity={0.7}
						>
							<Ionicons name="list-outline" size={18} color={COLORS.teal600} />
							<Text style={styles.detailToggleText}>연도별 상세 내역 보기</Text>
							<Ionicons name="chevron-down" size={16} color={COLORS.teal600} />
						</TouchableOpacity>
					) : (
						<>
							<View style={styles.detailHeaderRow}>
								<Text style={styles.detailTitle}>연도별 상세 내역</Text>
								<TouchableOpacity onPress={() => setShowFullDetail(false)}>
									<Text style={styles.detailCollapseText}>접기</Text>
								</TouchableOpacity>
							</View>
							{simulationResult.yearlyDetails.map((r: YearlyRefundDetail) => (
								<YearDetailCard
									key={r.year}
									detail={r}
									isExpanded={expandedYear === r.year}
									onToggle={() => setExpandedYear(expandedYear === r.year ? null : r.year)}
								/>
							))}
						</>
					)}

					<TaxFirmSection onConsultant={onConsultant} onHandoff={onHandoff} />
				</>
			)}

			{/* 면책 고지 (통합) */}
			<View style={{ marginTop: SPACING.xl }}>
				<DisclaimerBanner
					text="본 결과는 조세특례제한법 제30조 기준 참고용 시뮬레이션이며, 실제 세금과 차이가 있을 수 있습니다. 정확한 세무 판단은 세무사에게 문의하세요. FINZ는 세무 대리인이 아닙니다."
					type="warning"
				/>
			</View>

			<ActionButtons onRestart={onRestart} onSave={onSave} onShare={onShare} onPdf={onPdf} onGoHome={onGoHome} />
		</View>
	);
};

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────

const styles = StyleSheet.create({
	stepContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },

	eligibilitySection: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray100,
	},
	eligibilityHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.lg },
	eligibilityTitle: { fontSize: 18, fontWeight: "700" },
	eligibilityGrid: { gap: SPACING.sm },
	eligibilityItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.xs },
	eligibilityLabel: { fontSize: 13, color: COLORS.gray500 },
	eligibilityValue: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray800,
		textAlign: "right",
		flex: 1,
		marginLeft: SPACING.xl,
	},

	ineligibleSection: {
		marginTop: SPACING.md,
		paddingTop: SPACING.md,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray200,
		gap: SPACING.sm,
	},
	ineligibleRow: { flexDirection: "row", alignItems: "flex-start" },
	ineligibleCode: { fontSize: 13, fontWeight: "700", color: COLORS.red500 },
	ineligibleDetail: { fontSize: 12, color: COLORS.gray600, lineHeight: 17, marginTop: 1 },

	resultHighlight: {
		backgroundColor: COLORS.teal50,
		borderRadius: RADIUS.xl,
		padding: SPACING.xxl,
		alignItems: "center",
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	resultLabel: { fontSize: 14, fontWeight: "600", color: COLORS.teal700, marginBottom: SPACING.sm },
	resultAmount: { fontSize: 34, fontWeight: "700", color: COLORS.teal600, marginBottom: SPACING.md },
	resultBreakdown: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
	resultBreakdownItem: { alignItems: "center", paddingHorizontal: SPACING.lg },
	resultBreakdownLabel: { fontSize: 11, color: COLORS.teal600, marginBottom: 2 },
	resultBreakdownValue: { fontSize: 14, fontWeight: "700", color: COLORS.teal700 },
	resultBreakdownDivider: { width: 1, height: 28, backgroundColor: COLORS.teal100 },
	resultSub: { fontSize: 13, color: COLORS.gray500, marginTop: SPACING.xs },

	feeCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	feeCardHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
	feeCardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.teal700 },
	feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.xs },
	feeLabel: { fontSize: 13, color: COLORS.gray500 },
	feeValue: { fontSize: 13, fontWeight: "600", color: COLORS.gray800 },
	feeDivider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: SPACING.sm },
	feeNotice: { fontSize: 11, color: COLORS.gray400, textAlign: "center", marginTop: SPACING.sm },

	claimTypeGuide: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		gap: SPACING.sm,
	},
	claimTypeItem: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
	claimTypeDot: { width: 8, height: 8, borderRadius: 4 },
	claimTypeLabel: { fontSize: 13, fontWeight: "600", color: COLORS.gray700 },
	claimTypeDesc: { fontSize: 12, color: COLORS.gray500 },

	detailTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray900 },
	detailHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: SPACING.md,
	},
	detailCollapseText: { fontSize: 13, fontWeight: "600", color: COLORS.teal600 },
	detailToggleButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.teal50,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	detailToggleText: { fontSize: 14, fontWeight: "600", color: COLORS.teal600 },

	yearCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	yearCardDisabled: { opacity: 0.6 },
	yearCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	yearCardLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexShrink: 1 },
	yearCardYear: { fontSize: 16, fontWeight: "700", color: COLORS.gray800 },
	yearTypeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
	yearTypeText: { fontSize: 11, fontWeight: "700" },
	deadlineText: { fontSize: 10, color: COLORS.red500, fontWeight: "600" },
	yearCardRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
	yearCardRefund: { fontSize: 16, fontWeight: "700", color: COLORS.teal600 },
	yearCardDetail: {
		marginTop: SPACING.md,
		paddingTop: SPACING.md,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},

	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: COLORS.gray400,
		marginBottom: SPACING.xs,
		marginTop: SPACING.xs,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.sm },
	detailRowLabel: { fontSize: 13, color: COLORS.gray500, flex: 1, flexShrink: 1 },
	detailRowValue: { fontSize: 13, fontWeight: "600", color: COLORS.gray800 },
	divider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: SPACING.sm },

	yearIneligibleBox: {
		marginTop: SPACING.sm,
		backgroundColor: COLORS.orange50,
		borderRadius: RADIUS.sm,
		padding: SPACING.md,
		gap: SPACING.xs,
	},
	yearIneligibleRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.xs },
	yearIneligibleText: { flex: 1, fontSize: 12, color: COLORS.orange600, lineHeight: 17 },

	taxFirmSection: {
		backgroundColor: COLORS.orange50,
		borderRadius: RADIUS.lg,
		padding: SPACING.xl,
		marginTop: SPACING.xl,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.orange50,
	},
	taxFirmHeader: { marginBottom: SPACING.lg },
	taxFirmTitle: { fontSize: 16, fontWeight: "700", color: COLORS.orange600, marginBottom: SPACING.sm },
	taxFirmSubtitle: { fontSize: 13, color: COLORS.orange600, lineHeight: 20 },
	taxFirmBenefits: { gap: SPACING.sm, marginBottom: SPACING.lg },
	benefitRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
	benefitText: { fontSize: 13, color: COLORS.gray700 },

	consultantButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.orange600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
	},
	consultantButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },

	handoffForm: { marginTop: SPACING.md, gap: SPACING.md },
	handoffFormTitle: { fontSize: 15, fontWeight: "700", color: COLORS.orange600, marginBottom: SPACING.xs },
	handoffField: { gap: SPACING.xs },
	handoffLabel: { fontSize: 13, fontWeight: "600", color: COLORS.gray600 },
	handoffInput: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.sm,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		fontSize: 14,
		backgroundColor: COLORS.white,
		color: COLORS.gray900,
	},
	consentRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
	consentText: { fontSize: 13, color: COLORS.gray600, flex: 1 },
	cancelHandoffButton: { alignItems: "center", paddingVertical: SPACING.md },
	cancelHandoffText: { fontSize: 14, color: COLORS.gray500, fontWeight: "600" },

	actionRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: SPACING.xxl,
		marginBottom: SPACING.lg,
	},
	actionButton: { alignItems: "center", gap: SPACING.xs, padding: SPACING.md },
	actionButtonText: { fontSize: 12, color: COLORS.teal600, fontWeight: "600" },
	saveButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	saveButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
	restartButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.teal600,
	},
	restartButtonText: { fontSize: 15, fontWeight: "600", color: COLORS.teal600 },
});

export default Track1ResultStep;
