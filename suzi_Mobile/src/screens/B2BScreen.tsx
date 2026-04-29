import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";

const B2BScreen = () => {
	const navigation = useNavigation<any>();
	const [company, setCompany] = useState("");
	const [contactName, setContactName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [message, setMessage] = useState("");

	const handleSubmit = () => {
		Alert.alert("문의 접수 완료", "담당자가 영업일 기준 1~2일 내 연락드리겠습니다.");
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<Text style={styles.topBarTitle}>B2B 문의</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 히어로 */}
				<View style={styles.hero}>
					<View style={styles.heroIcon}>
						<Ionicons name="business-outline" size={36} color={COLORS.teal600} />
					</View>
					<Text style={styles.heroTitle}>기업 제휴 문의</Text>
					<Text style={styles.heroSubtitle}>
						FINZ의 세무 시뮬레이션 기술을{"\n"}
						귀사의 서비스에 연동하세요
					</Text>
				</View>

				{/* 혜택 */}
				<View style={styles.benefitsSection}>
					{[
						{
							icon: "shield-checkmark-outline",
							title: "API 연동",
							desc: "세무 시뮬레이션 API 제공",
						},
						{
							icon: "people-outline",
							title: "화이트라벨",
							desc: "귀사 브랜드로 서비스 제공",
						},
						{
							icon: "analytics-outline",
							title: "맞춤 리포트",
							desc: "기업 맞춤형 분석 리포트",
						},
					].map((item, i) => (
						<View key={i} style={styles.benefitCard}>
							<Ionicons name={item.icon as any} size={24} color={COLORS.teal600} />
							<Text style={styles.benefitTitle}>{item.title}</Text>
							<Text style={styles.benefitDesc}>{item.desc}</Text>
						</View>
					))}
				</View>

				{/* 폼 */}
				<View style={styles.formSection}>
					<Text style={styles.formSectionTitle}>문의하기</Text>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>회사명 *</Text>
						<TextInput
							style={styles.formInput}
							value={company}
							onChangeText={setCompany}
							placeholder="회사명"
							placeholderTextColor={COLORS.gray400}
						/>
					</View>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>담당자 *</Text>
						<TextInput
							style={styles.formInput}
							value={contactName}
							onChangeText={setContactName}
							placeholder="이름"
							placeholderTextColor={COLORS.gray400}
						/>
					</View>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>이메일 *</Text>
						<TextInput
							style={styles.formInput}
							value={email}
							onChangeText={setEmail}
							placeholder="example@company.com"
							placeholderTextColor={COLORS.gray400}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
					</View>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>연락처</Text>
						<TextInput
							style={styles.formInput}
							value={phone}
							onChangeText={setPhone}
							placeholder="010-0000-0000"
							placeholderTextColor={COLORS.gray400}
							keyboardType="phone-pad"
						/>
					</View>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>문의 내용</Text>
						<TextInput
							style={[styles.formInput, { height: 120, textAlignVertical: "top" }]}
							value={message}
							onChangeText={setMessage}
							placeholder="제휴 관련 문의 내용을 작성해주세요"
							placeholderTextColor={COLORS.gray400}
							multiline
						/>
					</View>

					<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
						<Text style={styles.submitButtonText}>문의 보내기</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
	},
	topBarTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
	scroll: { paddingBottom: 40 },

	hero: { alignItems: "center", paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
	heroIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: COLORS.teal50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SPACING.lg,
	},
	heroTitle: { fontSize: 24, fontWeight: "700", color: COLORS.gray900, marginBottom: SPACING.sm },
	heroSubtitle: { fontSize: 15, color: COLORS.gray500, textAlign: "center", lineHeight: 22 },

	benefitsSection: {
		flexDirection: "row",
		paddingHorizontal: SPACING.xl,
		gap: SPACING.md,
		marginBottom: SPACING.xxxl,
	},
	benefitCard: {
		flex: 1,
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		alignItems: "center",
		gap: SPACING.sm,
	},
	benefitTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
	benefitDesc: { fontSize: 12, color: COLORS.gray500, textAlign: "center" },

	formSection: { paddingHorizontal: SPACING.xl },
	formSectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.xl,
	},
	formGroup: { marginBottom: SPACING.lg },
	formLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray700, marginBottom: SPACING.sm },
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
	submitButton: {
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.lg,
		borderRadius: RADIUS.md,
		alignItems: "center",
		marginTop: SPACING.sm,
	},
	submitButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
});

export default B2BScreen;
