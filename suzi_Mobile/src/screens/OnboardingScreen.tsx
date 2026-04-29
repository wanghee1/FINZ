import React, { useState, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	ScrollView,
	Platform,
	Keyboard,
	TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { LIFECYCLE_STAGES } from "../constants";
import { LifecycleStage } from "../types";
import { useAuth } from "../context/AuthContext";

const OnboardingScreen = () => {
	const navigation = useNavigation<any>();
	const { updateProfile } = useAuth();
	const [birthDate, setBirthDate] = useState("");
	const [detectedStage, setDetectedStage] = useState<LifecycleStage | null>(null);
	const [isInputFocused, setIsInputFocused] = useState(false);
	const inputRef = useRef<TextInput>(null);

	const getAgeFromBirthDate = (bd: string): number => {
		const year = new Date(bd).getFullYear();
		return new Date().getFullYear() - year;
	};

	const handleCalculate = () => {
		Keyboard.dismiss();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return;
		const bd = new Date(birthDate);
		if (isNaN(bd.getTime())) return;
		const year = bd.getFullYear();
		if (year < 1930 || year > new Date().getFullYear()) return;
		const age = new Date().getFullYear() - year;
		if (age <= 25) setDetectedStage("FORMATION");
		else if (age <= 50) setDetectedStage("OPERATION");
		else setDetectedStage("TRANSFER");
	};

	const handleContinue = async () => {
		const stageIndex = detectedStage === "FORMATION" ? 0 : detectedStage === "OPERATION" ? 1 : 2;
		try {
			await updateProfile({ stage_index: stageIndex });
		} catch {
			// If profile update fails, still allow navigation
		}
		// After updating, the user is already signed in so AppNavigator
		// will show authenticated screens. Just navigate to MainTab.
		navigation.navigate("MainTab" as any);
	};

	const handleDone = () => {
		Keyboard.dismiss();
	};

	const stageInfo = detectedStage ? LIFECYCLE_STAGES.find((s) => s.key === detectedStage) : null;

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.keyboardAvoid}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
			>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						bounces={false}
					>
						<View style={styles.content}>
							{/* 진행 표시 */}
							<View style={styles.progressRow}>
								<View style={[styles.progressDot, styles.progressDotActive]} />
								<View style={[styles.progressDot, detectedStage ? styles.progressDotActive : null]} />
							</View>

							{!detectedStage ? (
								<>
									{/* Step 1: 생년 입력 */}
									<View style={styles.iconCircle}>
										<Ionicons name="calendar-outline" size={32} color={COLORS.teal600} />
									</View>
									<Text style={styles.title}>생년월일을 알려주세요</Text>
									<Text style={styles.subtitle}>
										맞춤형 금융·세무 가이드를 제공하기 위해{"\n"}생애주기 단계를 확인합니다
									</Text>

									<View style={styles.inputRow}>
										<TextInput
											ref={inputRef}
											style={[styles.yearInput, isInputFocused && styles.yearInputFocused]}
											placeholder="예: 1997-03-15"
											placeholderTextColor={COLORS.gray400}
											value={birthDate}
											onChangeText={(text) => {
												const digits = text.replace(/\D/g, "").slice(0, 8);
												let formatted = digits;
												if (digits.length > 4) {
													formatted = digits.slice(0, 4) + "-" + digits.slice(4);
												}
												if (digits.length > 6) {
													formatted = digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6);
												}
												setBirthDate(formatted);
											}}
											keyboardType="number-pad"
											maxLength={10}
											returnKeyType="done"
											onFocus={() => setIsInputFocused(true)}
											onBlur={() => setIsInputFocused(false)}
											onSubmitEditing={handleCalculate}
										/>
									</View>

									{/* iOS number-pad 키보드용 완료 버튼 */}
									{isInputFocused && (
										<TouchableOpacity style={styles.doneButton} onPress={handleDone}>
											<Ionicons name="checkmark-circle" size={18} color={COLORS.teal600} />
											<Text style={styles.doneButtonText}>입력 완료</Text>
										</TouchableOpacity>
									)}

									<TouchableOpacity
										style={[styles.button, !birthDate && styles.buttonDisabled]}
										onPress={handleCalculate}
										disabled={!birthDate}
									>
										<Text style={styles.buttonText}>생애주기 확인</Text>
									</TouchableOpacity>
								</>
							) : (
								<>
									{/* Step 2: 결과 표시 */}
									<View style={[styles.iconCircle, { backgroundColor: stageInfo?.bgColor }]}>
										<Ionicons name={stageInfo?.icon as any} size={32} color={stageInfo?.color} />
									</View>
									<Text style={styles.title}>
										당신의 생애주기는{"\n"}
										<Text style={[styles.titleAccent, { color: stageInfo?.color }]}>
											{stageInfo?.label}
										</Text>
										입니다
									</Text>
									<Text style={styles.subtitle}>{stageInfo?.description}</Text>

									<View style={[styles.stageCard, { borderColor: stageInfo?.color + "30" }]}>
										<View style={styles.stageCardRow}>
											<Text style={styles.stageCardLabel}>연령대</Text>
											<Text style={styles.stageCardValue}>{stageInfo?.ageRange}</Text>
										</View>
										<View style={styles.stageCardRow}>
											<Text style={styles.stageCardLabel}>생년월일</Text>
											<Text style={styles.stageCardValue}>{birthDate}</Text>
										</View>
										<View style={styles.stageCardRow}>
											<Text style={styles.stageCardLabel}>나이</Text>
											<Text style={styles.stageCardValue}>{getAgeFromBirthDate(birthDate)}세</Text>
										</View>
									</View>

									<TouchableOpacity style={styles.button} onPress={handleContinue}>
										<Text style={styles.buttonText}>시작하기</Text>
										<Ionicons name="arrow-forward" size={18} color={COLORS.white} />
									</TouchableOpacity>
								</>
							)}
						</View>
					</ScrollView>
				</TouchableWithoutFeedback>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	keyboardAvoid: { flex: 1 },
	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
	},
	content: {
		paddingHorizontal: SPACING.xl,
		alignItems: "center",
		paddingVertical: SPACING.xxxl,
	},
	progressRow: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginBottom: SPACING.xxxl,
	},
	progressDot: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: COLORS.gray200,
	},
	progressDotActive: {
		backgroundColor: COLORS.teal600,
	},
	iconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.xxl,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: COLORS.gray900,
		textAlign: "center",
		lineHeight: 34,
		marginBottom: SPACING.md,
	},
	titleAccent: { fontWeight: "700" },
	subtitle: {
		fontSize: 15,
		color: COLORS.gray500,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: SPACING.xxl,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.lg,
	},
	yearInput: {
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		fontSize: 20,
		fontWeight: "700",
		color: COLORS.gray900,
		width: 200,
		textAlign: "center",
		backgroundColor: COLORS.gray50,
	},
	yearInputFocused: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.white,
	},
	yearSuffix: { fontSize: 18, fontWeight: "600", color: COLORS.gray500 },
	doneButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.xs,
		paddingVertical: SPACING.sm,
		paddingHorizontal: SPACING.lg,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.teal50,
		borderWidth: 1,
		borderColor: COLORS.teal100,
		marginBottom: SPACING.lg,
	},
	doneButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.teal600,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.teal600,
		paddingHorizontal: SPACING.xxxl,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		gap: SPACING.sm,
		width: "100%",
		justifyContent: "center",
	},
	buttonDisabled: { backgroundColor: COLORS.gray300 },
	buttonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
	stageCard: {
		borderWidth: 1.5,
		borderRadius: RADIUS.lg,
		padding: SPACING.xl,
		width: "100%",
		marginBottom: SPACING.xxl,
		backgroundColor: COLORS.white,
	},
	stageCardRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: SPACING.sm,
	},
	stageCardLabel: { fontSize: 14, color: COLORS.gray500 },
	stageCardValue: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
});

export default OnboardingScreen;
