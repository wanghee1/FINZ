import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { Gender, EmploymentType, TaxReductionConfig } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import DatePickerField from "../../components/DatePickerField";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AgeInfo {
	age: number;
	taxAge: number;
	adjustedAge: number;
	employmentType: EmploymentType | null;
	needsMilitaryDoc: boolean;
}

interface Track1BasicInfoStepProps {
	birthDate: string;
	setBirthDate: (v: string) => void;
	gender: Gender;
	setGender: (v: Gender) => void;
	employmentDate: string;
	setEmploymentDate: (v: string) => void;
	businessRegNo: string;
	setBusinessRegNo: (v: string) => void;
	isSme: boolean;
	setIsSme: (v: boolean) => void;
	ageInfo: AgeInfo | null;
	reductionConfig: TaxReductionConfig | null;
	onNext: () => void;
}

// ──────────────────────────────────────────
// 성별 선택
// ──────────────────────────────────────────

const GenderSelector: React.FC<{
	gender: Gender;
	setGender: (v: Gender) => void;
}> = ({ gender, setGender }) => (
	<View style={styles.formGroup}>
		<Text style={styles.formLabel}>
			성별 <Text style={styles.requiredStar}>*</Text>
		</Text>
		<View style={styles.genderRow}>
			<TouchableOpacity
				style={[styles.genderButton, gender === "M" && styles.genderButtonActive]}
				onPress={() => setGender("M")}
			>
				<Ionicons
					name={gender === "M" ? "checkmark-circle" : "ellipse-outline"}
					size={20}
					color={gender === "M" ? COLORS.teal600 : COLORS.gray400}
				/>
				<Text style={[styles.genderText, gender === "M" && styles.genderTextActive]}>남성</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.genderButton, gender === "F" && styles.genderButtonActive]}
				onPress={() => setGender("F")}
			>
				<Ionicons
					name={gender === "F" ? "checkmark-circle" : "ellipse-outline"}
					size={20}
					color={gender === "F" ? COLORS.teal600 : COLORS.gray400}
				/>
				<Text style={[styles.genderText, gender === "F" && styles.genderTextActive]}>여성</Text>
			</TouchableOpacity>
		</View>
		<Text style={styles.formHint}>남성 군필자의 경우 복무기간을 나이에서 차감합니다 (최대 6년)</Text>
	</View>
);

// ──────────────────────────────────────────
// 연령 판정 미리보기 카드 (v2.3: 세법상 나이 + 유형 표시)
// ──────────────────────────────────────────

const AgePreviewCard: React.FC<{ ageInfo: AgeInfo }> = ({ ageInfo }) => {
	const { employmentType } = ageInfo;
	const isEligible = employmentType !== null;

	const typeLabel =
		employmentType === "YOUTH"
			? "청년 (만 15~34세)"
			: employmentType === "SENIOR"
				? "고령자 (만 60세 이상)"
				: "해당 없음";

	return (
		<View style={[styles.previewCard, isEligible ? styles.previewCardSuccess : styles.previewCardFail]}>
			<View style={styles.previewCardHeader}>
				<Ionicons
					name={isEligible ? "checkmark-circle" : "close-circle"}
					size={18}
					color={isEligible ? COLORS.green600 : COLORS.red500}
				/>
				<Text style={[styles.previewCardTitle, { color: isEligible ? COLORS.green600 : COLORS.red500 }]}>
					{isEligible ? "감면 대상 판정" : "감면 대상 아님"}
				</Text>
			</View>
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>취업 시점 만 나이</Text>
				<Text style={styles.previewValue}>만 {ageInfo.age}세</Text>
			</View>
			{ageInfo.taxAge !== ageInfo.age && (
				<View style={styles.previewRow}>
					<Text style={styles.previewLabel}>세법상 나이</Text>
					<Text style={[styles.previewValue, { color: COLORS.teal600, fontWeight: "700" }]}>
						만 {ageInfo.taxAge.toFixed(1)}세
					</Text>
				</View>
			)}
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>감면 유형</Text>
				<Text style={[styles.previewValue, { color: isEligible ? COLORS.teal600 : COLORS.red500 }]}>
					{typeLabel}
				</Text>
			</View>
			{ageInfo.needsMilitaryDoc && (
				<View style={styles.militaryDocNotice}>
					<Ionicons name="document-text-outline" size={14} color={COLORS.orange600} />
					<Text style={styles.militaryDocText}>병적증명서 제출이 필요합니다 (만 35~40세 남성)</Text>
				</View>
			)}
		</View>
	);
};

// ──────────────────────────────────────────
// 감면 설정 미리보기 카드 (v2.3: 유형별 분기)
// ──────────────────────────────────────────

const ReductionPreviewCard: React.FC<{
	config: TaxReductionConfig;
	employmentType: EmploymentType | null;
}> = ({ config, employmentType }) => {
	const rate = employmentType === "SENIOR" ? 70 : config.reductionRate * 100;
	const period = employmentType === "SENIOR" ? 3 : config.maxPeriodYears;
	const capText = config.annualCap > 99999999 ? "한도 없음" : formatCurrency(config.annualCap);

	return (
		<View style={styles.previewCard}>
			<Text style={styles.previewCardTitle2}>적용 감면 조건</Text>
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>적용 구분</Text>
				<Text style={styles.previewValue}>{employmentType === "SENIOR" ? "고령자 감면" : config.label}</Text>
			</View>
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>감면율</Text>
				<Text style={[styles.previewValue, { color: COLORS.teal600, fontWeight: "700" }]}>
					{rate.toFixed(0)}%
				</Text>
			</View>
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>연간 한도</Text>
				<Text style={styles.previewValue}>{capText}</Text>
			</View>
			<View style={styles.previewRow}>
				<Text style={styles.previewLabel}>감면 기간</Text>
				<Text style={styles.previewValue}>최대 {period}년</Text>
			</View>
			<Text style={styles.capNotice}>
				* 연간 한도는 과세연도 기준 적용 (2022년 이전 150만, 2023년 이후 200만)
			</Text>
		</View>
	);
};

// ──────────────────────────────────────────
// SME 토글 섹션
// ──────────────────────────────────────────

const SmeToggleSection: React.FC<{
	isSme: boolean;
	setIsSme: (v: boolean) => void;
}> = ({ isSme, setIsSme }) => (
	<View style={styles.smeToggleSection}>
		<Text style={styles.formLabel}>중소기업 재직 여부</Text>
		<View style={styles.smeToggleRow}>
			<TouchableOpacity
				style={[styles.smeToggle, isSme && styles.smeToggleActive]}
				onPress={() => setIsSme(true)}
			>
				<Ionicons
					name={isSme ? "checkmark-circle" : "ellipse-outline"}
					size={20}
					color={isSme ? COLORS.teal600 : COLORS.gray400}
				/>
				<Text style={[styles.smeToggleText, isSme && styles.smeToggleTextActive]}>예, 중소기업입니다</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.smeToggle, !isSme && styles.smeToggleActive]}
				onPress={() => setIsSme(false)}
			>
				<Ionicons
					name={!isSme ? "checkmark-circle" : "ellipse-outline"}
					size={20}
					color={!isSme ? COLORS.red500 : COLORS.gray400}
				/>
				<Text style={[styles.smeToggleText, !isSme && styles.smeToggleTextActive]}>아니오</Text>
			</TouchableOpacity>
		</View>
		{!isSme && (
			<View style={styles.warningBox}>
				<Ionicons name="alert-circle-outline" size={16} color={COLORS.red500} />
				<Text style={styles.warningBoxText}>
					대기업·국가·지자체·공공기관·지방공기업 재직자는 감면 대상에서 제외됩니다.
				</Text>
			</View>
		)}
	</View>
);

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────

const Track1BasicInfoStep: React.FC<Track1BasicInfoStepProps> = ({
	birthDate,
	setBirthDate,
	gender,
	setGender,
	employmentDate,
	setEmploymentDate,
	businessRegNo,
	setBusinessRegNo,
	isSme,
	setIsSme,
	ageInfo,
	reductionConfig,
	onNext,
}) => {
	const isValid = birthDate.length >= 10 && employmentDate.length >= 10;

	return (
		<View style={styles.stepContent}>
			<Text style={styles.stepLabel}>기본 정보</Text>
			<Text style={styles.stepTitle}>기본 정보 입력</Text>
			<Text style={styles.stepSubtitle}>
				감면 대상 여부 확인에 필요한 기본 정보입니다{"\n"}
				청년(15~34세) 또는 고령자(60세 이상) 모두 진단 가능합니다
			</Text>

			<View style={styles.formGroup}>
				<Text style={styles.formLabel}>
					생년월일 <Text style={styles.requiredStar}>*</Text>
				</Text>
				<DatePickerField
					value={birthDate}
					onChange={setBirthDate}
					placeholder="생년월일을 선택하세요"
					minimumDate={new Date(1950, 0, 1)}
					maximumDate={new Date(2010, 11, 31)}
				/>
				<Text style={styles.formHint}>취업 시점 만 나이 및 세법상 나이 계산에 사용됩니다</Text>
			</View>

			<GenderSelector gender={gender} setGender={setGender} />

			<View style={styles.formGroup}>
				<Text style={styles.formLabel}>
					최초 중소기업 취업일 <Text style={styles.requiredStar}>*</Text>
				</Text>
				<DatePickerField
					value={employmentDate}
					onChange={setEmploymentDate}
					placeholder="취업일을 선택하세요"
					minimumDate={new Date(2000, 0, 1)}
					maximumDate={new Date()}
				/>
				<Text style={styles.formHint}>
					중소기업에 처음 취업한 날짜를 입력해주세요{"\n"}
					이직 시에도 최초 중소기업 취업일이 기준입니다{"\n"}
					감면기간은 입사일에 시작 — 퇴사해도 멈추지 않습니다
				</Text>
			</View>

			<View style={styles.formGroup}>
				<Text style={styles.formLabel}>사업자등록번호 (현재 근무처)</Text>
				<TextInput
					style={styles.formInput}
					placeholder="예: 123-45-67890"
					placeholderTextColor={COLORS.gray400}
					value={businessRegNo}
					onChangeText={setBusinessRegNo}
					keyboardType="number-pad"
				/>
				<Text style={styles.formHint}>중소기업 여부 판별에 사용됩니다</Text>
			</View>

			<SmeToggleSection isSme={isSme} setIsSme={setIsSme} />

			{ageInfo && <AgePreviewCard ageInfo={ageInfo} />}

			{reductionConfig && ageInfo?.employmentType && (
				<ReductionPreviewCard config={reductionConfig} employmentType={ageInfo.employmentType} />
			)}

			<TouchableOpacity
				style={[styles.primaryButton, !isValid && styles.primaryButtonDisabled]}
				onPress={onNext}
				disabled={!isValid}
			>
				<Text style={styles.primaryButtonText}>다음</Text>
			</TouchableOpacity>
		</View>
	);
};

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────

const styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.lg,
	},
	stepLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.teal600,
		marginBottom: SPACING.xs,
	},
	stepTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.sm,
	},
	stepSubtitle: {
		fontSize: 14,
		color: COLORS.gray500,
		marginBottom: SPACING.xl,
		lineHeight: 20,
	},
	requiredStar: {
		color: COLORS.red500,
		fontSize: 14,
	},
	formGroup: {
		marginBottom: SPACING.lg,
	},
	formLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray700,
		marginBottom: SPACING.sm,
	},
	formInput: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md + 2,
		fontSize: 15,
		color: COLORS.gray900,
		backgroundColor: COLORS.gray50,
	},
	formHint: {
		fontSize: 12,
		color: COLORS.gray400,
		marginTop: SPACING.xs,
		lineHeight: 17,
	},
	genderRow: {
		flexDirection: "row",
		gap: SPACING.sm,
	},
	genderButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.white,
	},
	genderButtonActive: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.teal50,
	},
	genderText: {
		fontSize: 14,
		color: COLORS.gray500,
	},
	genderTextActive: {
		color: COLORS.gray800,
		fontWeight: "600",
	},
	smeToggleSection: {
		marginBottom: SPACING.lg,
	},
	smeToggleRow: {
		flexDirection: "row",
		gap: SPACING.sm,
	},
	smeToggle: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.white,
	},
	smeToggleActive: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.teal50,
	},
	smeToggleText: {
		fontSize: 14,
		color: COLORS.gray500,
	},
	smeToggleTextActive: {
		color: COLORS.gray800,
		fontWeight: "600",
	},
	warningBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: COLORS.red50,
		padding: SPACING.md,
		borderRadius: RADIUS.sm,
		marginTop: SPACING.sm,
		gap: SPACING.sm,
	},
	warningBoxText: {
		flex: 1,
		fontSize: 12,
		color: COLORS.red500,
		lineHeight: 17,
	},
	previewCard: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray100,
	},
	previewCardSuccess: {
		backgroundColor: COLORS.teal50,
		borderColor: COLORS.teal100,
	},
	previewCardFail: {
		backgroundColor: COLORS.red50,
		borderColor: COLORS.red100,
	},
	previewCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.md,
	},
	previewCardTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	previewCardTitle2: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.gray600,
		marginBottom: SPACING.md,
	},
	previewRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: SPACING.xs,
	},
	previewLabel: {
		fontSize: 13,
		color: COLORS.gray500,
	},
	previewValue: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray800,
	},
	militaryDocNotice: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.xs,
		marginTop: SPACING.sm,
		backgroundColor: COLORS.orange50,
		padding: SPACING.sm,
		borderRadius: RADIUS.sm,
	},
	militaryDocText: {
		flex: 1,
		fontSize: 12,
		color: COLORS.orange600,
		lineHeight: 17,
	},
	capNotice: {
		fontSize: 11,
		color: COLORS.gray400,
		marginTop: SPACING.sm,
		lineHeight: 16,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		marginTop: SPACING.lg,
	},
	primaryButtonDisabled: {
		backgroundColor: COLORS.gray300,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.white,
	},
});

export default Track1BasicInfoStep;
