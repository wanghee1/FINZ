/**
 * 세무사 상담 — 세무사 선택 화면
 *
 * 시뮬레이션 결과 화면에서 "세무사 상담" 진입 시 표시
 * 사용자가 원하는 세무사를 선택하여 채팅 상담으로 이동
 */

import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { MOCK_CONSULTANTS, CONSULTANT_SPECIALTY_LABELS } from "../constants";
import { TaxConsultant, ConsultantSpecialty } from "../types";
import { useAIChatScreen } from "../hooks/useAIChatScreen";

const FILTER_OPTIONS: { key: ConsultantSpecialty | "all"; label: string }[] = [
	{ key: "all", label: "전체" },
	{ key: "property_tax", label: "종부세" },
	{ key: "income_tax", label: "소득세" },
	{ key: "capital_gains", label: "양도세" },
	{ key: "gift_inheritance", label: "증여·상속" },
	{ key: "amendment", label: "경정청구" },
];

const TaxConsultantListScreen = () => {
	const navigation = useNavigation<any>();
	const route = useRoute<any>();
	const from = route.params?.from;
	useAIChatScreen("consultant_list");

	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<ConsultantSpecialty | "all">("all");

	const filtered = useMemo(() => {
		let list = MOCK_CONSULTANTS;
		if (activeFilter !== "all") {
			list = list.filter((c) => c.specialties.includes(activeFilter));
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.firm.toLowerCase().includes(q) ||
					c.specialties.some((s) => CONSULTANT_SPECIALTY_LABELS[s].includes(q)),
			);
		}
		return list;
	}, [activeFilter, search]);

	const formatFee = (fee: number) => (fee === 0 ? "무료" : `${fee.toLocaleString("ko-KR")}원`);

	const handleSelect = (consultant: TaxConsultant) => {
		navigation.navigate("TaxConsultantChat", { consultant, from });
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* 상단 바 */}
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<Text style={styles.topBarTitle}>세무사 상담</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
				{/* 안내 */}
				<View style={styles.intro}>
					<Text style={styles.introTitle}>전문 세무사와 상담해보세요</Text>
					<Text style={styles.introSub}>
						시뮬레이션 결과를 바탕으로{"\n"}
						전문 세무사와 1:1 채팅 상담을 진행할 수 있습니다.
					</Text>
				</View>

				{/* 검색 */}
				<View style={styles.searchWrap}>
					<Ionicons name="search-outline" size={18} color={COLORS.gray400} />
					<TextInput
						style={styles.searchInput}
						placeholder="세무사 이름, 분야 검색"
						placeholderTextColor={COLORS.gray400}
						value={search}
						onChangeText={setSearch}
					/>
					{search.length > 0 && (
						<TouchableOpacity onPress={() => setSearch("")}>
							<Ionicons name="close-circle" size={18} color={COLORS.gray400} />
						</TouchableOpacity>
					)}
				</View>

				{/* 필터 칩 */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.filterRow}
					contentContainerStyle={styles.filterContent}
				>
					{FILTER_OPTIONS.map((opt) => (
						<TouchableOpacity
							key={opt.key}
							style={[styles.filterChip, activeFilter === opt.key && styles.filterChipActive]}
							onPress={() => setActiveFilter(opt.key)}
						>
							<Text
								style={[styles.filterChipText, activeFilter === opt.key && styles.filterChipTextActive]}
							>
								{opt.label}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>

				{/* 세무사 목록 */}
				<View style={styles.listSection}>
					<Text style={styles.listCount}>{filtered.length}명의 세무사</Text>

					{filtered.map((c) => (
						<TouchableOpacity
							key={c.id}
							style={styles.card}
							activeOpacity={0.7}
							onPress={() => handleSelect(c)}
						>
							{/* 프로필 영역 */}
							<View style={styles.cardTop}>
								<View style={styles.avatar}>
									<Ionicons name="person" size={24} color={COLORS.white} />
								</View>
								<View style={styles.cardInfo}>
									<View style={styles.nameRow}>
										<Text style={styles.cardName}>{c.name} 세무사</Text>
										{c.isOnline && <View style={styles.onlineDot} />}
									</View>
									<Text style={styles.cardFirm}>
										{c.firm} · 경력 {c.experience}년
									</Text>
								</View>
								<View style={styles.ratingWrap}>
									<Ionicons name="star" size={14} color={COLORS.yellow500} />
									<Text style={styles.ratingText}>{c.rating}</Text>
									<Text style={styles.reviewText}>({c.reviewCount})</Text>
								</View>
							</View>

							{/* 전문 분야 태그 */}
							<View style={styles.tagRow}>
								{c.specialties.map((s) => (
									<View key={s} style={styles.tag}>
										<Text style={styles.tagText}>{CONSULTANT_SPECIALTY_LABELS[s]}</Text>
									</View>
								))}
							</View>

							{/* 소개 */}
							<Text style={styles.cardIntro} numberOfLines={2}>
								{c.introduction}
							</Text>

							{/* 하단 정보 */}
							<View style={styles.cardBottom}>
								<View style={styles.cardMeta}>
									<Ionicons name="chatbubble-outline" size={13} color={COLORS.gray400} />
									<Text style={styles.cardMetaText}>{c.responseTime}</Text>
								</View>
								<View style={styles.feeWrap}>
									<Text style={styles.feeLabel}>상담료</Text>
									<Text style={styles.feeValue}>{formatFee(c.consultationFee)}</Text>
								</View>
							</View>

							{/* 상담 시작 버튼 */}
							<TouchableOpacity style={styles.chatBtn} onPress={() => handleSelect(c)}>
								<Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.white} />
								<Text style={styles.chatBtnText}>채팅 상담 시작</Text>
							</TouchableOpacity>
						</TouchableOpacity>
					))}

					{filtered.length === 0 && (
						<View style={styles.emptyWrap}>
							<Ionicons name="search-outline" size={40} color={COLORS.gray300} />
							<Text style={styles.emptyText}>조건에 맞는 세무사가 없습니다</Text>
							<Text style={styles.emptySub}>검색어 또는 필터를 변경해보세요</Text>
						</View>
					)}
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

	intro: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, marginBottom: SPACING.lg },
	introTitle: { fontSize: 24, fontWeight: "700", color: COLORS.gray900, lineHeight: 34 },
	introSub: { fontSize: 14, color: COLORS.gray500, lineHeight: 21, marginTop: SPACING.sm },

	searchWrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginHorizontal: SPACING.xl,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	searchInput: { flex: 1, fontSize: 15, color: COLORS.gray900, padding: 0 },

	filterRow: { marginTop: SPACING.md, marginBottom: SPACING.lg },
	filterContent: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
	filterChip: {
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
	},
	filterChipActive: { backgroundColor: COLORS.teal600 },
	filterChipText: { fontSize: 13, fontWeight: "600", color: COLORS.gray500 },
	filterChipTextActive: { color: COLORS.white },

	listSection: { paddingHorizontal: SPACING.xl },
	listCount: { fontSize: 13, color: COLORS.gray500, marginBottom: SPACING.md },

	card: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	cardTop: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
	},
	cardInfo: { flex: 1, marginLeft: SPACING.md },
	nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	cardName: { fontSize: 16, fontWeight: "700", color: COLORS.gray900 },
	onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green500 },
	cardFirm: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
	ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
	ratingText: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
	reviewText: { fontSize: 12, color: COLORS.gray400 },

	tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: SPACING.md },
	tag: {
		paddingHorizontal: SPACING.sm + 2,
		paddingVertical: 3,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.teal50,
	},
	tagText: { fontSize: 11, fontWeight: "600", color: COLORS.teal700 },

	cardIntro: { fontSize: 13, color: COLORS.gray600, lineHeight: 19, marginBottom: SPACING.md },

	cardBottom: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
		marginBottom: SPACING.md,
	},
	cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
	cardMetaText: { fontSize: 12, color: COLORS.gray400 },
	feeWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
	feeLabel: { fontSize: 12, color: COLORS.gray400 },
	feeValue: { fontSize: 14, fontWeight: "700", color: COLORS.teal600 },

	chatBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.teal600,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
	},
	chatBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.white },

	emptyWrap: {
		alignItems: "center",
		paddingVertical: SPACING.xxxl * 2,
		gap: SPACING.sm,
	},
	emptyText: { fontSize: 16, fontWeight: "700", color: COLORS.gray500 },
	emptySub: { fontSize: 13, color: COLORS.gray400 },
});

export default TaxConsultantListScreen;
