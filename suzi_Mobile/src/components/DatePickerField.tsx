import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Platform,
	Modal,
	KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";

interface DatePickerFieldProps {
	value: string;
	onChange: (dateStr: string) => void;
	placeholder?: string;
	minimumDate?: Date;
	maximumDate?: Date;
}

function parseDateString(dateStr: string): Date | null {
	if (!dateStr || dateStr.length < 10) return null;
	const [y, m, d] = dateStr.split("-").map(Number);
	if (!y || !m || !d) return null;
	const date = new Date(y, m - 1, d);
	if (isNaN(date.getTime())) return null;
	return date;
}

function formatToDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
	const date = parseDateString(dateStr);
	if (!date) return "";
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isValidDate(y: number, m: number, d: number): boolean {
	if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
	const date = new Date(y, m - 1, d);
	return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * 날짜 입력 필드
 *
 * 네이티브 DateTimePicker 의존 없이
 * TextInput 기반 YYYYMMDD 입력 → 자동 포맷팅
 * 모든 플랫폼에서 동일하게 동작
 */
const DatePickerField: React.FC<DatePickerFieldProps> = ({
	value,
	onChange,
	placeholder = "날짜를 선택하세요",
}) => {
	const [show, setShow] = useState(false);
	const [rawInput, setRawInput] = useState("");
	const [inputError, setInputError] = useState<string | null>(null);
	const inputRef = useRef<TextInput>(null);

	// onChange를 ref로 유지 — 클로저 stale 문제 방지
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const handleOpen = () => {
		// 기존 value에서 숫자만 추출하여 rawInput 초기화
		if (value && value.length >= 10) {
			setRawInput(value.replace(/-/g, ""));
		} else {
			setRawInput("");
		}
		setInputError(null);
		setShow(true);
		setTimeout(() => inputRef.current?.focus(), 300);
	};

	const handleRawInputChange = (text: string) => {
		const digits = text.replace(/\D/g, "").slice(0, 8);
		setRawInput(digits);
		setInputError(null);
	};

	// 입력된 숫자를 YYYY-MM-DD로 포맷하여 프리뷰
	const getFormattedPreview = (): { text: string; valid: boolean } => {
		if (rawInput.length < 8) return { text: "", valid: false };
		const y = parseInt(rawInput.slice(0, 4), 10);
		const m = parseInt(rawInput.slice(4, 6), 10);
		const d = parseInt(rawInput.slice(6, 8), 10);
		if (isValidDate(y, m, d)) {
			return { text: `${y}년 ${m}월 ${d}일`, valid: true };
		}
		return { text: "올바르지 않은 날짜입니다", valid: false };
	};

	const handleConfirm = () => {
		if (rawInput.length < 8) {
			setInputError("8자리 숫자를 입력해주세요");
			return;
		}
		const y = parseInt(rawInput.slice(0, 4), 10);
		const m = parseInt(rawInput.slice(4, 6), 10);
		const d = parseInt(rawInput.slice(6, 8), 10);

		if (!isValidDate(y, m, d)) {
			setInputError("올바르지 않은 날짜입니다");
			return;
		}

		const formatted = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		onChangeRef.current(formatted);
		setShow(false);
	};

	const preview = getFormattedPreview();
	const hasValue = value.length >= 10;

	// rawInput을 표시용으로 포맷
	const displayRawInput = (): string => {
		const d = rawInput;
		if (d.length <= 4) return d;
		if (d.length <= 6) return `${d.slice(0, 4)} / ${d.slice(4)}`;
		return `${d.slice(0, 4)} / ${d.slice(4, 6)} / ${d.slice(6)}`;
	};

	return (
		<View>
			<TouchableOpacity
				style={[styles.field, hasValue && styles.fieldFilled]}
				onPress={handleOpen}
				activeOpacity={0.7}
				accessibilityLabel="날짜 선택"
			>
				<Ionicons name="calendar-outline" size={18} color={hasValue ? COLORS.teal600 : COLORS.gray400} />
				<Text style={[styles.fieldText, !hasValue && styles.fieldPlaceholder]}>
					{hasValue ? formatDisplayDate(value) : placeholder}
				</Text>
				<Ionicons name="chevron-down" size={16} color={COLORS.gray400} />
			</TouchableOpacity>

			<Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.modalOverlay}
				>
					<TouchableOpacity
						style={styles.modalBackdrop}
						activeOpacity={1}
						onPress={() => setShow(false)}
					/>
					<View style={styles.modalContent}>
						{/* 헤더 */}
						<View style={styles.modalHeader}>
							<TouchableOpacity onPress={() => setShow(false)}>
								<Text style={styles.modalCancel}>취소</Text>
							</TouchableOpacity>
							<Text style={styles.modalTitle}>날짜 입력</Text>
							<TouchableOpacity onPress={handleConfirm}>
								<Text style={styles.modalConfirm}>확인</Text>
							</TouchableOpacity>
						</View>

						{/* 입력 영역 */}
						<View style={styles.inputArea}>
							<Text style={styles.inputGuide}>YYYY / MM / DD</Text>

							{/* 숫자 입력 필드 */}
							<TextInput
								ref={inputRef}
								style={styles.dateInput}
								value={displayRawInput()}
								onChangeText={handleRawInputChange}
								keyboardType="number-pad"
								maxLength={14} // "2024 / 06 / 15" = 14 chars with spaces/slashes
								placeholder="2020 / 03 / 15"
								placeholderTextColor={COLORS.gray300}
							/>

							{/* 프리뷰 */}
							{rawInput.length === 8 && (
								<Text style={[styles.previewText, !preview.valid && styles.previewError]}>
									{preview.text}
								</Text>
							)}

							{/* 에러 */}
							{inputError && (
								<View style={styles.errorRow}>
									<Ionicons name="alert-circle" size={14} color={COLORS.red500} />
									<Text style={styles.errorText}>{inputError}</Text>
								</View>
							)}

							{/* 빠른 선택 */}
							<View style={styles.quickRow}>
								{[
									{ label: "오늘", fn: () => setRawInput(formatToDateString(new Date()).replace(/-/g, "")) },
									{ label: "1년 전", fn: () => {
										const d = new Date();
										d.setFullYear(d.getFullYear() - 1);
										setRawInput(formatToDateString(d).replace(/-/g, ""));
									}},
									{ label: "3년 전", fn: () => {
										const d = new Date();
										d.setFullYear(d.getFullYear() - 3);
										setRawInput(formatToDateString(d).replace(/-/g, ""));
									}},
									{ label: "5년 전", fn: () => {
										const d = new Date();
										d.setFullYear(d.getFullYear() - 5);
										setRawInput(formatToDateString(d).replace(/-/g, ""));
									}},
								].map((item) => (
									<TouchableOpacity
										key={item.label}
										style={styles.quickChip}
										onPress={() => { item.fn(); setInputError(null); }}
									>
										<Text style={styles.quickChipText}>{item.label}</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	field: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md + 2,
		backgroundColor: COLORS.gray50,
		gap: SPACING.sm,
	},
	fieldFilled: {
		borderColor: COLORS.teal100,
		backgroundColor: COLORS.teal50,
	},
	fieldText: {
		flex: 1,
		fontSize: 15,
		color: COLORS.gray900,
		fontWeight: "600",
	},
	fieldPlaceholder: {
		color: COLORS.gray400,
		fontWeight: "400",
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.35)",
	},
	modalContent: {
		backgroundColor: COLORS.white,
		borderTopLeftRadius: RADIUS.xl,
		borderTopRightRadius: RADIUS.xl,
		paddingBottom: SPACING.xxxl,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray100,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	modalCancel: {
		fontSize: 15,
		color: COLORS.gray500,
		fontWeight: "600",
	},
	modalConfirm: {
		fontSize: 15,
		color: COLORS.teal600,
		fontWeight: "700",
	},
	// 입력 영역
	inputArea: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.xxl,
		alignItems: "center",
		gap: SPACING.md,
	},
	inputGuide: {
		fontSize: 13,
		color: COLORS.gray400,
		fontWeight: "600",
		letterSpacing: 2,
	},
	dateInput: {
		width: "100%",
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		backgroundColor: COLORS.gray50,
		textAlign: "center",
		letterSpacing: 3,
	},
	previewText: {
		fontSize: 15,
		fontWeight: "600",
		color: COLORS.teal600,
	},
	previewError: {
		color: COLORS.red500,
	},
	errorRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.xs,
	},
	errorText: {
		fontSize: 13,
		color: COLORS.red500,
	},
	// 빠른 선택
	quickRow: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginTop: SPACING.sm,
	},
	quickChip: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	quickChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray600,
	},
});

export default DatePickerField;
