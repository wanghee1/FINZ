import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { MILITARY_SERVICE_TYPE_LABELS } from "../../constants";
import { MilitaryServiceType, Gender, EmploymentType } from "../../types";
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

interface MilitaryInfo {
	months: number;
	deductionYears: number;
	formatted: string;
}

interface Track1MilitaryStepProps {
	gender: Gender;
	hasMilitary: boolean;
	setHasMilitary: (v: boolean) => void;
	militaryType: MilitaryServiceType;
	setMilitaryType: (v: MilitaryServiceType) => void;
	enlistDate: string;
	setEnlistDate: (v: string) => void;
	dischargeDate: string;
	setDischargeDate: (v: string) => void;
	militaryInfo: MilitaryInfo | null;
	ageInfo: AgeInfo | null;
	needsMilDoc: boolean;
	onNext: () => void;
}

// ──────────────────────────────────────────
// 병역 여부 토글
// ──────────────────────────────────────────

const MilitaryToggle: React.FC<{
	hasMilitary: boolean;
	setHasMilitary: (v: boolean) => void;
}> = ({ hasMilitary, setHasMilitary }) => (
	<View style={styles.toggleRow}>
		<Text style={styles.formLabel}>병역 이행 여부</Text>
		<View style={styles.toggleGroup}>
			<TouchableOpacity
				style={[styles.toggleButton, hasMilitary && styles.toggleButtonActive]}
				onPress={() => setHasMilitary(true)}
			>
				<Text style={[styles.toggleText, hasMilitary && styles.toggleTextActive]}>예</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.toggleButton, !hasMilitary && styles.toggleButtonActive]}
				onPress={() => setHasMilitary(false)}
			>
				<Text style={[styles.toggleText, !hasMilitary && styles.toggleTextActive]}>아니오</Text>
			</TouchableOpacity>
		</View>
	</View>
);

// ──────────────────────────────────────────
// 복무 유형 선택
// ──────────────────────────────────────────

const MilitaryTypeSelector: React.FC<{
	militaryType: MilitaryServiceType;
	setMilitaryType: (v: MilitaryServiceType) => void;
}> = ({ militaryType, setMilitaryType }) => (
	<View style={styles.formGroup}>
		<Text style={styles.formLabel}>복무 유형</Text>
		<View style={styles.militaryTypeGrid}>
			{(Object.entries(MILITARY_SERVICE_TYPE_LABELS) as [MilitaryServiceType, string][]).map(([key, label]) => (
				<TouchableOpacity
					key={key}
					style={[styles.militaryTypeChip, militaryType === key && styles.militaryTypeChipActive]}
					onPress={() => setMilitaryType(key)}
				>
					<Text
						style={[styles.militaryTypeChipText, militaryType === key && styles.militaryTypeChipTextActive]}
					>
						{label}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	</View>
);

// ──────────────────────────────────────────
// 병역 차감 결과 카드
// ──────────────────────────────────────────

const MilitaryResultCard: React.FC<{
	militaryInfo: MilitaryInfo;
	ageInfo: AgeInfo | null;
}> = ({ militaryInfo, ageInfo }) => (
	<View style={styles.militaryResultCard}>
		<View style={styles.militaryResultHeader}>
			<Ionicons name="shield-checkmark-outline" size={20} color={COLORS.teal600} />
			<Text style={styles.militaryResultTitle}>병역 차감 계산 결과</Text>
		</View>
		<View style={styles.militaryResultGrid}>
			<View style={styles.militaryResultItem}>
				<Text style={styles.militaryResultLabel}>복무 기간</Text>
				<Text style={styles.militaryResultValue}>{militaryInfo.formatted}</Text>
			</View>
			<View style={styles.militaryResultItem}>
				<Text style={styles.militaryResultLabel}>차감 연수</Text>
				<Text style={styles.militaryResultValue}>
					{militaryInfo.deductionYears.toFixed(1)}년{" "}
					<Text style={{ fontSize: 11, color: COLORS.gray400 }}>(최대 6년)</Text>
				</Text>
			</View>
			{ageInfo && (
				<>
					<View style={styles.militaryResultItem}>
						<Text style={styles.militaryResultLabel}>취업 시점 만 나이</Text>
						<Text style={styles.militaryResultValue}>만 {ageInfo.age}세</Text>
					</View>
					<View style={styles.militaryResultItem}>
						<Text style={styles.militaryResultLabel}>세법상 나이</Text>
						<Text
							style={[
								styles.militaryResultValue,
								{
									color: ageInfo.taxAge <= 34 ? COLORS.teal600 : COLORS.red500,
									fontWeight: "700",
								},
							]}
						>
							만 {ageInfo.taxAge.toFixed(1)}세{ageInfo.taxAge <= 34 ? " (청년)" : " (초과)"}
						</Text>
					</View>
				</>
			)}
		</View>
	</View>
);

// ──────────────────────────────────────────
// 병적증명서 필요 안내
// ──────────────────────────────────────────

const MilitaryDocRequired: React.FC = () => (
	<View style={styles.docRequiredCard}>
		<View style={styles.docRequiredHeader}>
			<Ionicons name="document-text" size={20} color={COLORS.orange600} />
			<Text style={styles.docRequiredTitle}>병적증명서 필요</Text>
		</View>
		<Text style={styles.docRequiredDesc}>
			취업 시점 만 35~40세 남성은 병적증명서 확인이 필요합니다.{"\n"}
			군복무 기간 차감 후 세법상 나이가 34세 이하이면 청년 감면 대상입니다.{"\n\n"}
			정부24(gov.kr)에서 온라인 발급 가능하며,{"\n"}
			입영일·전역일 정보를 아래에 입력해주세요.
		</Text>
	</View>
);

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────

const Track1MilitaryStep: React.FC<Track1MilitaryStepProps> = ({
	gender,
	hasMilitary,
	setHasMilitary,
	militaryType,
	setMilitaryType,
	enlistDate,
	setEnlistDate,
	dischargeDate,
	setDischargeDate,
	militaryInfo,
	ageInfo,
	needsMilDoc,
	onNext,
}) => {
	if (gender === "F") {
		return (
			<View style={styles.stepContent}>
				<Text style={styles.stepLabel}>Step 2</Text>
				<Text style={styles.stepTitle}>병역 정보</Text>
				<View style={styles.noMilitaryInfo}>
					<Ionicons name="information-circle-outline" size={20} color={COLORS.gray400} />
					<Text style={styles.noMilitaryText}>
						여성은 병역 차감 대상이 아닙니다.{"\n"}
						취업 시점의 만 나이가 그대로 적용됩니다.
					</Text>
				</View>
				<TouchableOpacity style={styles.primaryButton} onPress={onNext}>
					<Text style={styles.primaryButtonText}>다음</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (ageInfo && ageInfo.age <= 34 && !needsMilDoc) {
		return (
			<View style={styles.stepContent}>
				<Text style={styles.stepLabel}>Step 2</Text>
				<Text style={styles.stepTitle}>병역 정보</Text>
				<View style={styles.alreadyYouthCard}>
					<Ionicons name="checkmark-circle" size={24} color={COLORS.green600} />
					<View style={{ flex: 1, marginLeft: SPACING.sm }}>
						<Text style={styles.alreadyYouthTitle}>병역 차감 불필요</Text>
						<Text style={styles.alreadyYouthDesc}>
							취업 시점 만 {ageInfo.age}세로 이미 청년 요건(만 34세 이하)을 충족합니다.{"\n"}
							병역 기간 입력 없이도 감면 대상입니다.
						</Text>
					</View>
				</View>
				<MilitaryToggle hasMilitary={hasMilitary} setHasMilitary={setHasMilitary} />
				{hasMilitary && (
					<>
						<MilitaryTypeSelector militaryType={militaryType} setMilitaryType={setMilitaryType} />
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>입대일</Text>
							<DatePickerField
								value={enlistDate}
								onChange={setEnlistDate}
								placeholder="입대일을 선택하세요"
								minimumDate={new Date(2000, 0, 1)}
								maximumDate={new Date()}
							/>
						</View>
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>전역일</Text>
							<DatePickerField
								value={dischargeDate}
								onChange={setDischargeDate}
								placeholder="전역일을 선택하세요"
								minimumDate={new Date(2000, 0, 1)}
								maximumDate={new Date()}
							/>
						</View>
						{militaryInfo && <MilitaryResultCard militaryInfo={militaryInfo} ageInfo={ageInfo} />}
					</>
				)}
				<TouchableOpacity style={styles.primaryButton} onPress={onNext}>
					<Text style={styles.primaryButtonText}>다음</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.stepContent}>
			<Text style={styles.stepLabel}>Step 2</Text>
			<Text style={styles.stepTitle}>병역 정보</Text>
			<Text style={styles.stepSubtitle}>병역 이행 기간은 연령 판정 시 최대 6년까지 차감됩니다</Text>

			{needsMilDoc && <MilitaryDocRequired />}

			<MilitaryToggle hasMilitary={hasMilitary} setHasMilitary={setHasMilitary} />

			{hasMilitary && (
				<>
					<MilitaryTypeSelector militaryType={militaryType} setMilitaryType={setMilitaryType} />

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>입대일</Text>
						<DatePickerField
							value={enlistDate}
							onChange={setEnlistDate}
							placeholder="입대일을 선택하세요"
							minimumDate={new Date(2000, 0, 1)}
							maximumDate={new Date()}
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>전역일</Text>
						<DatePickerField
							value={dischargeDate}
							onChange={setDischargeDate}
							placeholder="전역일을 선택하세요"
							minimumDate={new Date(2000, 0, 1)}
							maximumDate={new Date()}
						/>
					</View>

					{militaryInfo && <MilitaryResultCard militaryInfo={militaryInfo} ageInfo={ageInfo} />}
				</>
			)}

			{!hasMilitary && (
				<View style={styles.noMilitaryInfo}>
					<Ionicons name="information-circle-outline" size={20} color={COLORS.gray400} />
					<Text style={styles.noMilitaryText}>
						병역 미이행 시 취업 시점의 만 나이가{"\n"}그대로 적용됩니다.
					</Text>
				</View>
			)}

			<TouchableOpacity style={styles.primaryButton} onPress={onNext}>
				<Text style={styles.primaryButtonText}>다음</Text>
			</TouchableOpacity>
		</View>
	);
};

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────

const styles = StyleSheet.create({
	stepContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
	stepLabel: { fontSize: 13, fontWeight: "700", color: COLORS.teal600, marginBottom: SPACING.xs },
	stepTitle: { fontSize: 22, fontWeight: "700", color: COLORS.gray900, marginBottom: SPACING.sm },
	stepSubtitle: { fontSize: 14, color: COLORS.gray500, marginBottom: SPACING.xl, lineHeight: 20 },
	formGroup: { marginBottom: SPACING.lg },
	formLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray700, marginBottom: SPACING.sm },
	toggleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: SPACING.xl,
	},
	toggleGroup: { flexDirection: "row", gap: SPACING.sm },
	toggleButton: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
	},
	toggleButtonActive: { backgroundColor: COLORS.teal600 },
	toggleText: { fontSize: 14, fontWeight: "600", color: COLORS.gray500 },
	toggleTextActive: { color: COLORS.white },
	militaryTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
	militaryTypeChip: {
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		backgroundColor: COLORS.white,
	},
	militaryTypeChipActive: { borderColor: COLORS.teal600, backgroundColor: COLORS.teal50 },
	militaryTypeChipText: { fontSize: 13, color: COLORS.gray500 },
	militaryTypeChipTextActive: { color: COLORS.teal700, fontWeight: "700" },
	militaryResultCard: {
		backgroundColor: COLORS.teal50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	militaryResultHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
	militaryResultTitle: { fontSize: 14, fontWeight: "700", color: COLORS.teal700 },
	militaryResultGrid: { gap: SPACING.sm },
	militaryResultItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
	militaryResultLabel: { fontSize: 13, color: COLORS.teal700 },
	militaryResultValue: { fontSize: 13, fontWeight: "600", color: COLORS.teal800 },
	noMilitaryInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.gray50,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.lg,
	},
	noMilitaryText: { flex: 1, fontSize: 13, color: COLORS.gray500, lineHeight: 19 },
	alreadyYouthCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: COLORS.green100,
		padding: SPACING.lg,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.xl,
	},
	alreadyYouthTitle: { fontSize: 14, fontWeight: "700", color: COLORS.green600, marginBottom: 4 },
	alreadyYouthDesc: { fontSize: 13, color: COLORS.gray600, lineHeight: 19 },
	docRequiredCard: {
		backgroundColor: COLORS.orange50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.xl,
		borderWidth: 1,
		borderColor: COLORS.orange500,
	},
	docRequiredHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.sm },
	docRequiredTitle: { fontSize: 15, fontWeight: "700", color: COLORS.orange600 },
	docRequiredDesc: { fontSize: 13, color: COLORS.gray600, lineHeight: 19 },
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
	primaryButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
});

export default Track1MilitaryStep;
