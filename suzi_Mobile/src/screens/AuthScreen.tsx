import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { useAuth } from "../context/AuthContext";

// ── Password validation rules ────────────────────────────────────────────────
interface PasswordRule {
	label: string;
	test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
	{ label: "10자 이상", test: (pw) => pw.length >= 10 },
	{ label: "소문자", test: (pw) => /[a-z]/.test(pw) },
	{ label: "대문자", test: (pw) => /[A-Z]/.test(pw) },
	{ label: "숫자", test: (pw) => /\d/.test(pw) },
	{ label: "특수문자", test: (pw) => /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/]/.test(pw) },
];

const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
	if (!password) return null;

	const results = PASSWORD_RULES.map((rule) => ({
		label: rule.label,
		passed: rule.test(password),
	}));

	// Check for repeated chars
	const hasRepeated = /(.)\1{3,}/.test(password);

	return (
		<View style={pwStyles.container}>
			<View style={pwStyles.rulesGrid}>
				{results.map((r, i) => (
					<View key={i} style={pwStyles.ruleRow}>
						<Ionicons
							name={r.passed ? "checkmark-circle" : "ellipse-outline"}
							size={14}
							color={r.passed ? COLORS.green600 : COLORS.gray400}
						/>
						<Text style={[pwStyles.ruleText, r.passed && pwStyles.ruleTextPassed]}>
							{r.label}
						</Text>
					</View>
				))}
			</View>
			{hasRepeated && (
				<Text style={pwStyles.warningText}>
					같은 문자를 4번 이상 연속 사용할 수 없습니다
				</Text>
			)}
		</View>
	);
};

const pwStyles = StyleSheet.create({
	container: { marginTop: 6, gap: 4 },
	rulesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
	ruleRow: { flexDirection: "row", alignItems: "center", gap: 4, width: "48%" },
	ruleText: { fontSize: 12, color: COLORS.gray400 },
	ruleTextPassed: { color: COLORS.green600 },
	warningText: { fontSize: 12, color: COLORS.red600, marginTop: 2 },
});

// ── Consent content ─────────────────────────────────────────────────────────
interface ConsentItemDef {
	id: string;
	label: string;
	required: boolean;
	content: string;
}

const CONSENT_ITEMS: ConsentItemDef[] = [
	{
		id: "privacy",
		label: "개인정보 처리방침 동의",
		required: true,
		content: `[개인정보 처리방침]

주식회사 FINZ(이하 "회사")는 관련 법령에 따라 아래의 목적으로 개인정보를 수집 및 이용합니다.

1. 수집 항목
• 이메일 주소, 비밀번호(암호화 저장), 이름, 출생연도, 성별
• 서비스 이용 기록, 접속 로그, 기기 정보

2. 이용 목적
• 회원 식별 및 본인 확인
• 서비스 제공 및 운영 (경정청구 환급액 조회, 세금 시뮬레이션 등)
• 고객 상담 및 민원 처리
• 서비스 개선 및 통계 분석

3. 보유 및 이용 기간
• 회원 탈퇴 시까지 (탈퇴 즉시 파기)
• 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 보관
  - 전자상거래법: 계약/청약철회 기록 5년, 소비자 불만 처리 기록 3년
  - 통신비밀보호법: 접속 로그 3개월

4. 동의 거부권
개인정보 수집·이용 동의를 거부할 수 있으나, 거부 시 회원가입이 불가합니다.`,
	},
	{
		id: "terms",
		label: "이용약관 동의",
		required: true,
		content: `[서비스 이용약관]

제1조 (목적)
본 약관은 주식회사 FINZ(이하 "회사")가 제공하는 세금 환급 조회 및 시뮬레이션 서비스(이하 "서비스")의 이용에 관한 사항을 규정합니다.

제2조 (서비스 내용)
① 청년 소득세 감면 경정청구 예상 환급액 조회
② 2주택자 6Way 세금 비교 시뮬레이션
③ 기타 회사가 추가 개발하여 제공하는 세금 관련 서비스

제3조 (이용자의 의무)
① 타인의 정보를 도용하여 서비스를 이용할 수 없습니다.
② 서비스를 통해 얻은 정보를 회사의 사전 동의 없이 복제·배포할 수 없습니다.
③ 서비스의 안정적 운영을 방해하는 행위를 할 수 없습니다.

제4조 (면책 조항)
① 서비스에서 제공하는 세금 계산 결과는 참고용이며, 실제 세금과 차이가 있을 수 있습니다.
② 회사는 시뮬레이션 결과의 정확성을 보증하지 않으며, 이를 근거로 한 의사결정에 대한 책임을 지지 않습니다.
③ 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.

제5조 (계약 해지)
회원은 언제든지 서비스 내 설정에서 탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.`,
	},
	{
		id: "marketing",
		label: "마케팅 정보 수신 동의",
		required: false,
		content: `[마케팅 정보 수신 동의]

1. 목적
• 신규 서비스 및 기능 안내
• 세법 개정 등 유용한 세금 관련 정보 제공
• 이벤트 및 프로모션 안내

2. 방법
• 앱 푸시 알림, 이메일

3. 동의 철회
설정 > 알림 관리에서 언제든지 수신을 거부할 수 있습니다.

※ 마케팅 정보 수신에 동의하지 않아도 서비스 이용에는 제한이 없습니다.`,
	},
];

// ── Main AuthScreen ──────────────────────────────────────────────────────────
const AuthScreen = () => {
	const navigation = useNavigation<any>();
	const { login, signup } = useAuth();
	const [isLogin, setIsLogin] = useState(true);
	const [signupStep, setSignupStep] = useState(1); // 1: 계정, 2: 개인정보, 3: 약관
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
	const [gender, setGender] = useState<"M" | "F">("M");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Consent states
	const [consentPrivacy, setConsentPrivacy] = useState(false);
	const [consentTerms, setConsentTerms] = useState(false);
	const [consentMarketing, setConsentMarketing] = useState(false);
	const [consentModal, setConsentModal] = useState<ConsentItemDef | null>(null);

	const allRequiredConsents = consentPrivacy && consentTerms;

	const toggleAllConsents = () => {
		const newVal = !(consentPrivacy && consentTerms && consentMarketing);
		setConsentPrivacy(newVal);
		setConsentTerms(newVal);
		setConsentMarketing(newVal);
	};

	const toggleConsent = (id: string) => {
		if (id === "privacy") setConsentPrivacy((v) => !v);
		else if (id === "terms") setConsentTerms((v) => !v);
		else if (id === "marketing") setConsentMarketing((v) => !v);
	};

	const isConsentChecked = (id: string) => {
		if (id === "privacy") return consentPrivacy;
		if (id === "terms") return consentTerms;
		if (id === "marketing") return consentMarketing;
		return false;
	};

	const setConsentChecked = (id: string, val: boolean) => {
		if (id === "privacy") setConsentPrivacy(val);
		else if (id === "terms") setConsentTerms(val);
		else if (id === "marketing") setConsentMarketing(val);
	};

	// Password confirmation match
	const passwordMatch = useMemo(() => {
		if (!passwordConfirm) return null; // not yet typed
		return password === passwordConfirm;
	}, [password, passwordConfirm]);

	// Password validation state
	const passwordValid = useMemo(() => {
		return PASSWORD_RULES.every((r) => r.test(password)) && !/(.)\1{3,}/.test(password);
	}, [password]);

	const validateEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

	const validateForm = (): string | null => {
		const trimmedEmail = email.trim();
		if (!trimmedEmail || !validateEmail(trimmedEmail)) {
			return "올바른 이메일 형식을 입력해주세요";
		}
		if (!password || password.length < 10) {
			return "비밀번호는 10자 이상이어야 합니다";
		}
		if (!isLogin && !passwordValid) {
			return "비밀번호 조건을 모두 충족해주세요";
		}
		if (!isLogin && password !== passwordConfirm) {
			return "비밀번호가 일치하지 않습니다";
		}
		if (!isLogin) {
			const trimmedName = name.trim();
			if (!trimmedName || trimmedName.length > 50) {
				return "이름을 입력해주세요 (최대 50자)";
			}
			if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
				return "올바른 생년월일을 입력해주세요 (예: 1997-03-15)";
			}
			const bd = new Date(birthDate);
			if (isNaN(bd.getTime()) || bd.getFullYear() < 1900 || bd > new Date()) {
				return "올바른 생년월일을 입력해주세요";
			}
			if (!allRequiredConsents) {
				return "필수 약관에 동의해주세요";
			}
		}
		return null;
	};

	/** Map known error codes and HTTP statuses to user-friendly messages. */
	const getErrorMessage = (err: any): string => {
		const code = err?.code;
		const message = err?.message || "";
		const httpStatus = err?.status;

		// HTTP status-based handling
		if (httpStatus === 429) {
			return "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요";
		}
		if (httpStatus === 409) {
			return "회원가입을 처리할 수 없습니다. 입력 정보를 확인해주세요";
		}
		if (httpStatus === 422) {
			// Pydantic validation error — extract details
			if (message.includes("소문자")) return "비밀번호에 소문자를 포함해주세요";
			if (message.includes("대문자")) return "비밀번호에 대문자를 포함해주세요";
			if (message.includes("숫자")) return "비밀번호에 숫자를 포함해주세요";
			if (message.includes("특수문자")) return "비밀번호에 특수문자를 포함해주세요";
			if (message.includes("일반적인")) return "너무 흔한 비밀번호입니다. 다른 비밀번호를 사용해주세요";
			if (message.includes("연속")) return "같은 문자를 4번 이상 연속 사용할 수 없습니다";
			if (message.includes("동의")) return "필수 약관에 동의해주세요";
			return "입력 정보를 확인해주세요";
		}

		const errorMap: Record<string, string> = {
			INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다",
			USER_EXISTS: "이미 가입된 이메일입니다",
			RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
			ACCOUNT_LOCKED: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요",
			NETWORK_ERROR: "네트워크 연결을 확인하세요",
			UNAUTHORIZED: "인증이 만료되었습니다. 다시 로그인해주세요",
			VALIDATION_ERROR: "입력 정보를 확인해주세요",
		};
		return errorMap[code] || message || "오류가 발생했습니다. 다시 시도해주세요";
	};

	const handleSubmit = async () => {
		if (loading) return;
		setError(null);

		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);
		try {
			if (isLogin) {
				await login({ email: email.trim(), password });
			} else {
				await signup({
					email: email.trim(),
					password,
					name: name.trim(),
					birth_date: birthDate,
					gender,
					consents: [
						{ consent_type: "PRIVACY_POLICY", granted: consentPrivacy },
						{ consent_type: "TERMS_OF_SERVICE", granted: consentTerms },
						{ consent_type: "MARKETING", granted: consentMarketing },
					],
				});
				navigation.navigate("Onboarding");
			}
		} catch (err: any) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	};

	const isSubmitDisabled = loading || (!isLogin && !allRequiredConsents);

	// ── 회원가입 단계별 검증 ──
	const validateStep1 = (): string | null => {
		const trimmedEmail = email.trim();
		if (!trimmedEmail || !validateEmail(trimmedEmail)) return "올바른 이메일 형식을 입력해주세요";
		if (!password || password.length < 10) return "비밀번호는 10자 이상이어야 합니다";
		if (!passwordValid) return "비밀번호 조건을 모두 충족해주세요";
		if (password !== passwordConfirm) return "비밀번호가 일치하지 않습니다";
		return null;
	};

	const validateStep2 = (): string | null => {
		const trimmedName = name.trim();
		if (!trimmedName || trimmedName.length > 50) return "이름을 입력해주세요 (최대 50자)";
		if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return "올바른 생년월일을 입력해주세요 (예: 1997-03-15)";
		const bd = new Date(birthDate);
		if (isNaN(bd.getTime()) || bd.getFullYear() < 1900 || bd > new Date()) return "올바른 생년월일을 입력해주세요";
		return null;
	};

	const handleNextStep = () => {
		setError(null);
		if (signupStep === 1) {
			const err = validateStep1();
			if (err) { setError(err); return; }
			setSignupStep(2);
		} else if (signupStep === 2) {
			const err = validateStep2();
			if (err) { setError(err); return; }
			setSignupStep(3);
		}
	};

	const handleBackStep = () => {
		setError(null);
		if (signupStep > 1) setSignupStep(signupStep - 1);
		else navigation.goBack();
	};

	const SIGNUP_STEP_LABELS = ["계정 정보", "기본 정보", "약관 동의"];

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					{/* 뒤로가기 */}
					<TouchableOpacity
						style={styles.backButton}
						onPress={isLogin ? () => navigation.goBack() : handleBackStep}
					>
						<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
					</TouchableOpacity>

					{/* 헤더 */}
					<View style={styles.header}>
						<Text style={styles.logo}>FINZ</Text>
						<Text style={styles.title}>{isLogin ? "로그인" : "회원가입"}</Text>
					</View>

					{/* 회원가입 단계 표시 */}
					{!isLogin && (
						<View style={styles.stepIndicator}>
							{SIGNUP_STEP_LABELS.map((label, i) => (
								<View key={i} style={styles.stepItem}>
									<View style={[
										styles.stepDot,
										i + 1 === signupStep && styles.stepDotActive,
										i + 1 < signupStep && styles.stepDotDone,
									]}>
										{i + 1 < signupStep ? (
											<Ionicons name="checkmark" size={12} color={COLORS.white} />
										) : (
											<Text style={[
												styles.stepDotText,
												(i + 1 === signupStep || i + 1 < signupStep) && styles.stepDotTextActive,
											]}>
												{i + 1}
											</Text>
										)}
									</View>
									<Text style={[
										styles.stepLabel,
										i + 1 === signupStep && styles.stepLabelActive,
									]}>
										{label}
									</Text>
								</View>
							))}
						</View>
					)}

					{/* 폼 */}
					<View style={styles.form}>
						{/* 로그인: 이메일 + 비밀번호만 */}
						{isLogin && (
							<>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>이메일</Text>
									<TextInput
										style={styles.input}
										placeholder="이메일을 입력하세요"
										placeholderTextColor={COLORS.gray400}
										value={email}
										onChangeText={setEmail}
										keyboardType="email-address"
										autoCapitalize="none"
									/>
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>비밀번호</Text>
									<View style={styles.passwordWrap}>
										<TextInput
											style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 44 }]}
											placeholder="비밀번호를 입력하세요"
											placeholderTextColor={COLORS.gray400}
											value={password}
											onChangeText={setPassword}
											secureTextEntry={!showPassword}
										/>
										<TouchableOpacity
											style={styles.eyeButton}
											onPress={() => setShowPassword(!showPassword)}
										>
											<Ionicons
												name={showPassword ? "eye-outline" : "eye-off-outline"}
												size={20}
												color={COLORS.gray400}
											/>
										</TouchableOpacity>
									</View>
								</View>
							</>
						)}

						{/* 회원가입 Step 1: 계정 정보 */}
						{!isLogin && signupStep === 1 && (
							<>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>이메일</Text>
									<TextInput
										style={styles.input}
										placeholder="이메일을 입력하세요"
										placeholderTextColor={COLORS.gray400}
										value={email}
										onChangeText={setEmail}
										keyboardType="email-address"
										autoCapitalize="none"
									/>
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>비밀번호</Text>
									<View style={styles.passwordWrap}>
										<TextInput
											style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 44 }]}
											placeholder="대/소문자, 숫자, 특수문자 포함 10자 이상"
											placeholderTextColor={COLORS.gray400}
											value={password}
											onChangeText={setPassword}
											secureTextEntry={!showPassword}
										/>
										<TouchableOpacity
											style={styles.eyeButton}
											onPress={() => setShowPassword(!showPassword)}
										>
											<Ionicons
												name={showPassword ? "eye-outline" : "eye-off-outline"}
												size={20}
												color={COLORS.gray400}
											/>
										</TouchableOpacity>
									</View>
									<PasswordStrengthIndicator password={password} />
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>비밀번호 확인</Text>
									<View style={[
										styles.passwordWrap,
										passwordMatch === false && styles.inputError,
										passwordMatch === true && styles.inputSuccess,
									]}>
										<TextInput
											style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 44 }]}
											placeholder="비밀번호를 다시 입력하세요"
											placeholderTextColor={COLORS.gray400}
											value={passwordConfirm}
											onChangeText={setPasswordConfirm}
											secureTextEntry={!showPasswordConfirm}
										/>
										<TouchableOpacity
											style={styles.eyeButton}
											onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
										>
											<Ionicons
												name={showPasswordConfirm ? "eye-outline" : "eye-off-outline"}
												size={20}
												color={COLORS.gray400}
											/>
										</TouchableOpacity>
									</View>
									{passwordMatch !== null && (
										<View style={styles.matchRow}>
											<Ionicons
												name={passwordMatch ? "checkmark-circle" : "close-circle"}
												size={14}
												color={passwordMatch ? COLORS.green600 : COLORS.red600}
											/>
											<Text style={[styles.matchText, { color: passwordMatch ? COLORS.green600 : COLORS.red600 }]}>
												{passwordMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
											</Text>
										</View>
									)}
								</View>
							</>
						)}

						{/* 회원가입 Step 2: 기본 정보 */}
						{!isLogin && signupStep === 2 && (
							<>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>이름</Text>
									<TextInput
										style={styles.input}
										placeholder="이름을 입력하세요"
										placeholderTextColor={COLORS.gray400}
										value={name}
										onChangeText={setName}
									/>
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>생년월일</Text>
									<TextInput
										style={styles.input}
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
									/>
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>성별</Text>
									<View style={{ flexDirection: "row", gap: 12 }}>
										<TouchableOpacity
											style={[styles.genderButton, gender === "M" && styles.genderButtonActive]}
											onPress={() => setGender("M")}
										>
											<Text style={[styles.genderText, gender === "M" && styles.genderTextActive]}>
												남성
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.genderButton, gender === "F" && styles.genderButtonActive]}
											onPress={() => setGender("F")}
										>
											<Text style={[styles.genderText, gender === "F" && styles.genderTextActive]}>
												여성
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							</>
						)}

						{/* 회원가입 Step 3: 약관 동의 */}
						{!isLogin && signupStep === 3 && (
							<View style={styles.consentSection}>
								<View style={styles.consentHeader}>
									<Text style={styles.consentTitle}>약관 동의</Text>
								</View>
								<TouchableOpacity style={styles.allConsentRow} onPress={toggleAllConsents} activeOpacity={0.7}>
									<Ionicons
										name={consentPrivacy && consentTerms && consentMarketing ? "checkbox" : "square-outline"}
										size={22}
										color={consentPrivacy && consentTerms && consentMarketing ? COLORS.teal600 : COLORS.gray400}
									/>
									<Text style={styles.allConsentText}>전체 동의</Text>
								</TouchableOpacity>
								<View style={styles.consentDivider} />
								{CONSENT_ITEMS.map((item) => {
									const checked = isConsentChecked(item.id);
									return (
										<TouchableOpacity
											key={item.id}
											style={styles.consentItemRow}
											onPress={() => toggleConsent(item.id)}
											activeOpacity={0.7}
										>
											<Ionicons
												name={checked ? "checkbox" : "square-outline"}
												size={22}
												color={checked ? COLORS.teal600 : COLORS.gray400}
											/>
											<View style={styles.consentItemLabelWrap}>
												<Text style={styles.consentItemLabel}>
													{item.required
														? <Text style={styles.consentRequired}>[필수] </Text>
														: <Text style={styles.consentOptional}>[선택] </Text>
													}
													{item.label}
												</Text>
											</View>
											<TouchableOpacity
												style={styles.consentViewBtn}
												onPress={() => setConsentModal(item)}
												hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
											>
												<Text style={styles.consentViewBtnText}>보기</Text>
												<Ionicons name="chevron-forward" size={14} color={COLORS.teal600} />
											</TouchableOpacity>
										</TouchableOpacity>
									);
								})}
							</View>
						)}

						{/* 에러 메시지 */}
						{error && (
							<View style={styles.errorBox}>
								<Ionicons name="alert-circle" size={16} color={COLORS.red600} />
								<Text style={styles.errorText}>{error}</Text>
							</View>
						)}

						{/* 버튼: 로그인 or 회원가입 단계별 */}
						{isLogin ? (
							<>
								<TouchableOpacity
									style={[styles.submitButton, loading && styles.submitButtonDisabled]}
									onPress={handleSubmit}
									disabled={loading}
								>
									{loading ? (
										<ActivityIndicator color={COLORS.white} />
									) : (
										<Text style={styles.submitButtonText}>로그인</Text>
									)}
								</TouchableOpacity>
								<Text style={styles.lockoutHint}>
									5회 이상 로그인 실패 시 15분간 계정이 잠깁니다
								</Text>
							</>
						) : signupStep < 3 ? (
							<TouchableOpacity style={styles.submitButton} onPress={handleNextStep}>
								<Text style={styles.submitButtonText}>다음</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
								onPress={handleSubmit}
								disabled={isSubmitDisabled}
							>
								{loading ? (
									<ActivityIndicator color={COLORS.white} />
								) : (
									<Text style={styles.submitButtonText}>회원가입</Text>
								)}
							</TouchableOpacity>
						)}

						{/* 전환 링크 */}
						<View style={styles.switchRow}>
							<Text style={styles.switchText}>
								{isLogin ? "아직 계정이 없으신가요?" : "이미 계정이 있으신가요?"}
							</Text>
							<TouchableOpacity onPress={() => { setIsLogin(!isLogin); setSignupStep(1); setError(null); }}>
								<Text style={styles.switchLink}>{isLogin ? "회원가입" : "로그인"}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* 약관 상세 모달 */}
			<Modal
				visible={!!consentModal}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setConsentModal(null)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>{consentModal?.label}</Text>
						<TouchableOpacity
							onPress={() => setConsentModal(null)}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Ionicons name="close" size={24} color={COLORS.gray600} />
						</TouchableOpacity>
					</View>
					<ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
						<Text style={styles.modalText}>{consentModal?.content}</Text>
						<View style={{ height: 40 }} />
					</ScrollView>
					<View style={styles.modalFooter}>
						<TouchableOpacity
							style={styles.modalAgreeBtn}
							onPress={() => {
								if (consentModal) {
									setConsentChecked(consentModal.id, true);
								}
								setConsentModal(null);
							}}
							activeOpacity={0.8}
						>
							<Text style={styles.modalAgreeBtnText}>확인 및 동의</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
	backButton: { paddingVertical: SPACING.md },
	header: { marginTop: SPACING.lg, marginBottom: SPACING.xxxl },
	logo: { fontSize: 16, fontWeight: "700", color: COLORS.teal600, marginBottom: SPACING.lg },
	title: { fontSize: 28, fontWeight: "700", color: COLORS.gray900, marginBottom: SPACING.sm },
	subtitle: { fontSize: 15, color: COLORS.gray500, lineHeight: 22 },

	form: { gap: SPACING.lg },
	inputGroup: { gap: SPACING.sm },
	label: { fontSize: 14, fontWeight: "600", color: COLORS.gray700 },
	input: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md + 2,
		fontSize: 15,
		color: COLORS.gray900,
		backgroundColor: COLORS.gray50,
	},
	passwordWrap: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		backgroundColor: COLORS.gray50,
	},
	eyeButton: { position: "absolute", right: SPACING.md },
	inputError: { borderColor: COLORS.red600 },
	inputSuccess: { borderColor: COLORS.green600 },
	matchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
	matchText: { fontSize: 12 },

	genderButton: {
		flex: 1,
		paddingVertical: SPACING.md + 2,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		alignItems: "center",
		backgroundColor: COLORS.gray50,
	},
	genderButtonActive: {
		borderColor: COLORS.teal600,
		backgroundColor: COLORS.teal50,
	},
	genderText: {
		fontSize: 15,
		color: COLORS.gray500,
		fontWeight: "600",
	},
	genderTextActive: {
		color: COLORS.teal600,
	},

	// Consent section
	consentSection: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	consentHeader: { marginBottom: SPACING.sm },
	consentTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
	allConsentRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 10,
		minHeight: 44,
	},
	allConsentText: { fontSize: 15, fontWeight: "600", color: COLORS.gray900 },
	consentDivider: {
		height: 1,
		backgroundColor: COLORS.gray200,
		marginVertical: 8,
	},
	consentItemRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 10,
		minHeight: 44,
	},
	consentItemLabelWrap: { flex: 1 },
	consentItemLabel: { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
	consentRequired: { color: COLORS.red600, fontWeight: "600" },
	consentOptional: { color: COLORS.gray400, fontWeight: "600" },
	consentViewBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
	consentViewBtnText: { fontSize: 13, color: COLORS.gray400 },

	// Modal
	modalContainer: { flex: 1, backgroundColor: COLORS.white },
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
	modalBody: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
	modalText: { fontSize: 14, color: COLORS.gray700, lineHeight: 22 },
	modalFooter: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray200,
	},
	modalAgreeBtn: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.teal600,
		paddingVertical: 16,
		borderRadius: RADIUS.md,
	},
	modalAgreeBtnText: { fontSize: 16, fontWeight: "700", color: COLORS.white },

	errorBox: {
		backgroundColor: COLORS.red50,
		borderRadius: RADIUS.md,
		padding: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.red100,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	errorText: {
		fontSize: 14,
		color: COLORS.red600,
		flex: 1,
	},

	submitButton: {
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		alignItems: "center",
		marginTop: SPACING.sm,
	},
	submitButtonDisabled: {
		backgroundColor: COLORS.gray300,
	},
	submitButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },

	lockoutHint: {
		fontSize: 12,
		color: COLORS.gray400,
		textAlign: "center",
	},

	switchRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: SPACING.sm,
		marginTop: SPACING.md,
	},
	switchText: { fontSize: 14, color: COLORS.gray500 },
	switchLink: { fontSize: 14, fontWeight: "700", color: COLORS.teal600 },

	// Step indicator
	stepIndicator: {
		flexDirection: "row",
		justifyContent: "center",
		gap: SPACING.xxl,
		marginBottom: SPACING.xl,
	},
	stepItem: { alignItems: "center", gap: SPACING.xs },
	stepDot: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.gray200,
		justifyContent: "center",
		alignItems: "center",
	},
	stepDotActive: { backgroundColor: COLORS.teal600 },
	stepDotDone: { backgroundColor: COLORS.teal600 },
	stepDotText: { fontSize: 13, fontWeight: "700", color: COLORS.gray400 },
	stepDotTextActive: { color: COLORS.white },
	stepLabel: { fontSize: 11, color: COLORS.gray400, fontWeight: "600" },
	stepLabelActive: { color: COLORS.teal600 },
});

export default AuthScreen;
