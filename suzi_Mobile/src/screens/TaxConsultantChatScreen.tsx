/**
 * 세무사 채팅 상담 화면
 *
 * 선택한 세무사와 1:1 채팅 상담
 * 문서(PDF/이미지) 업로드 지원
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	Alert,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../theme";
import { CONSULTANT_SPECIALTY_LABELS } from "../constants";
import { TaxConsultant, ChatMessage, ChatAttachment } from "../types";

// ── 초기 시스템 메시지 생성 ──

const createInitialMessages = (consultant: TaxConsultant, from?: string): ChatMessage[] => {
	const now = new Date();
	const timeStr = (offset: number) => {
		const d = new Date(now.getTime() - offset);
		return d.toISOString();
	};

	const fromLabel =
		from === "Track1YouthTax"
			? "청년 소득세 감면 시뮬레이션"
			: from === "Track2Property"
				? "6Way 세금 비교 시뮬레이션"
				: "시뮬레이션";

	return [
		{
			id: "sys-1",
			sender: "system",
			text: `${consultant.name} 세무사님과의 상담이 시작되었습니다.`,
			timestamp: timeStr(3000),
		},
		{
			id: "sys-2",
			sender: "system",
			text: "상담 내용은 암호화되어 안전하게 보호됩니다. 시뮬레이션 결과 PDF나 관련 서류를 첨부하시면 더 정확한 상담이 가능합니다.",
			timestamp: timeStr(2000),
		},
		{
			id: "consultant-1",
			sender: "consultant",
			text: `안녕하세요! ${consultant.name}입니다. ${fromLabel} 결과를 바탕으로 상담을 도와드리겠습니다.\n\n궁금하신 점이 있으시면 편하게 말씀해 주세요. 시뮬레이션 결과 PDF를 보내주시면 더 구체적으로 안내해 드릴 수 있습니다.`,
			timestamp: timeStr(1000),
		},
	];
};

// ── 목업 자동 응답 ──

const MOCK_RESPONSES = [
	"네, 확인했습니다. 보내주신 내용을 검토하고 있습니다. 잠시만 기다려 주세요.",
	"좋은 질문이십니다. 해당 부분에 대해 좀 더 자세히 설명드리겠습니다.",
	"첨부해 주신 자료를 확인했습니다. 추가 질문이 있으시면 말씀해 주세요.",
	"이 부분은 개별 상황에 따라 달라질 수 있어서, 추가 정보가 필요합니다. 관련 서류를 보내주시면 더 정확하게 안내해 드리겠습니다.",
	"시뮬레이션 결과를 확인했습니다. 실제 세액과는 차이가 있을 수 있으니, 정확한 신고를 위해 추가 검토가 필요합니다.",
];

// ── 컴포넌트 ──

const TaxConsultantChatScreen = () => {
	const navigation = useNavigation<any>();
	const route = useRoute<any>();
	const consultant: TaxConsultant = route.params?.consultant;
	const from: string | undefined = route.params?.from;

	const [messages, setMessages] = useState<ChatMessage[]>(() => createInitialMessages(consultant, from));
	const [inputText, setInputText] = useState("");
	const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
	const [isTyping, setIsTyping] = useState(false);
	const flatListRef = useRef<FlatList>(null);
	const typingDots = useRef(new Animated.Value(0)).current;

	// 타이핑 애니메이션
	useEffect(() => {
		if (isTyping) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(typingDots, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(typingDots, {
						toValue: 0,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			typingDots.setValue(0);
		}
	}, [isTyping, typingDots]);

	// 메시지 전송
	const handleSend = useCallback(() => {
		const trimmed = inputText.trim();
		if (!trimmed && !pendingAttachment) return;

		const newMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			sender: "user",
			text: trimmed,
			timestamp: new Date().toISOString(),
			attachment: pendingAttachment ?? undefined,
		};

		setMessages((prev) => [...prev, newMsg]);
		setInputText("");
		setPendingAttachment(null);

		// 목업 자동 응답
		setIsTyping(true);
		const delay = 1500 + Math.random() * 2000;
		setTimeout(() => {
			setIsTyping(false);
			const response: ChatMessage = {
				id: `consultant-${Date.now()}`,
				sender: "consultant",
				text: MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)],
				timestamp: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, response]);
		}, delay);
	}, [inputText, pendingAttachment]);

	// 문서 업로드 (목업)
	const handleAttach = useCallback(() => {
		Alert.alert("문서 첨부", "첨부할 파일 종류를 선택해주세요", [
			{
				text: "PDF 문서",
				onPress: () => {
					setPendingAttachment({
						id: `att-${Date.now()}`,
						name: "시뮬레이션_결과.pdf",
						type: "pdf",
						size: "2.3 MB",
					});
				},
			},
			{
				text: "이미지",
				onPress: () => {
					setPendingAttachment({
						id: `att-${Date.now()}`,
						name: "서류_사진.jpg",
						type: "image",
						size: "1.8 MB",
					});
				},
			},
			{
				text: "기타 문서",
				onPress: () => {
					setPendingAttachment({
						id: `att-${Date.now()}`,
						name: "원천징수영수증.xlsx",
						type: "document",
						size: "540 KB",
					});
				},
			},
			{ text: "취소", style: "cancel" },
		]);
	}, []);

	// 시간 포맷
	const formatTime = (iso: string) => {
		const d = new Date(iso);
		const h = d.getHours();
		const m = d.getMinutes().toString().padStart(2, "0");
		const period = h < 12 ? "오전" : "오후";
		const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return `${period} ${hour12}:${m}`;
	};

	// 첨부파일 아이콘
	const getAttachIcon = (type: string) => {
		switch (type) {
			case "pdf":
				return "document-text-outline";
			case "image":
				return "image-outline";
			default:
				return "document-outline";
		}
	};

	// ── 메시지 렌더 ──

	const renderMessage = ({ item }: { item: ChatMessage }) => {
		if (item.sender === "system") {
			return (
				<View style={styles.systemMsgWrap}>
					<Text style={styles.systemMsgText}>{item.text}</Text>
				</View>
			);
		}

		const isUser = item.sender === "user";

		return (
			<View style={[styles.msgRow, isUser && styles.msgRowUser]}>
				{/* 세무사 아바타 */}
				{!isUser && (
					<View style={styles.msgAvatar}>
						<Ionicons name="person" size={14} color={COLORS.white} />
					</View>
				)}

				<View style={styles.msgContent}>
					{!isUser && <Text style={styles.msgSender}>{consultant.name} 세무사</Text>}
					<View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleConsultant]}>
						{/* 첨부파일 */}
						{item.attachment && (
							<View style={styles.attachInBubble}>
								<Ionicons
									name={getAttachIcon(item.attachment.type) as any}
									size={18}
									color={isUser ? COLORS.white : COLORS.teal700}
								/>
								<View style={{ flex: 1 }}>
									<Text style={[styles.attachName, isUser && { color: COLORS.white }]}>
										{item.attachment.name}
									</Text>
									<Text style={[styles.attachSize, isUser && { color: "rgba(255,255,255,0.7)" }]}>
										{item.attachment.size}
									</Text>
								</View>
							</View>
						)}
						{item.text.length > 0 && (
							<Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
						)}
					</View>
					<Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>{formatTime(item.timestamp)}</Text>
				</View>
			</View>
		);
	};

	// ── 메인 렌더 ──

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			{/* 상단 바 */}
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.gray700} />
				</TouchableOpacity>
				<View style={styles.topBarCenter}>
					<View style={styles.topAvatar}>
						<Ionicons name="person" size={14} color={COLORS.white} />
					</View>
					<View>
						<Text style={styles.topBarName}>{consultant.name} 세무사</Text>
						<Text style={styles.topBarStatus}>
							{consultant.isOnline ? "접속 중" : "오프라인"} · {consultant.responseTime}
						</Text>
					</View>
				</View>
				<TouchableOpacity
					onPress={() =>
						Alert.alert(
							"세무사 정보",
							`${consultant.name}\n${consultant.firm}\n경력 ${consultant.experience}년\n전문: ${consultant.specialties.map((s) => CONSULTANT_SPECIALTY_LABELS[s]).join(", ")}`,
						)
					}
				>
					<Ionicons name="information-circle-outline" size={24} color={COLORS.gray500} />
				</TouchableOpacity>
			</View>

			{/* 채팅 영역 */}
			<KeyboardAvoidingView
				style={styles.chatArea}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={0}
			>
				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={renderMessage}
					contentContainerStyle={styles.messageList}
					onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
					onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
				/>

				{/* 타이핑 인디케이터 */}
				{isTyping && (
					<View style={styles.typingWrap}>
						<View style={styles.msgAvatar}>
							<Ionicons name="person" size={14} color={COLORS.white} />
						</View>
						<View style={styles.typingBubble}>
							<Animated.View style={[styles.typingDot, { opacity: typingDots }]} />
							<Animated.View
								style={[
									styles.typingDot,
									{
										opacity: Animated.multiply(typingDots, new Animated.Value(0.7)),
									},
								]}
							/>
							<Animated.View
								style={[
									styles.typingDot,
									{
										opacity: Animated.multiply(typingDots, new Animated.Value(0.4)),
									},
								]}
							/>
						</View>
					</View>
				)}

				{/* 첨부 미리보기 */}
				{pendingAttachment && (
					<View style={styles.pendingAttach}>
						<Ionicons
							name={getAttachIcon(pendingAttachment.type) as any}
							size={18}
							color={COLORS.teal700}
						/>
						<View style={{ flex: 1 }}>
							<Text style={styles.pendingAttachName}>{pendingAttachment.name}</Text>
							<Text style={styles.pendingAttachSize}>{pendingAttachment.size}</Text>
						</View>
						<TouchableOpacity onPress={() => setPendingAttachment(null)}>
							<Ionicons name="close-circle" size={20} color={COLORS.gray400} />
						</TouchableOpacity>
					</View>
				)}

				{/* 입력 영역 */}
				<View style={styles.inputBar}>
					<TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
						<Ionicons name="add-circle-outline" size={26} color={COLORS.teal600} />
					</TouchableOpacity>
					<View style={styles.inputWrap}>
						<TextInput
							style={styles.textInput}
							placeholder="메시지를 입력하세요..."
							placeholderTextColor={COLORS.gray400}
							value={inputText}
							onChangeText={setInputText}
							multiline
							maxLength={2000}
						/>
					</View>
					<TouchableOpacity
						style={[styles.sendBtn, inputText.trim() || pendingAttachment ? styles.sendBtnActive : {}]}
						onPress={handleSend}
						disabled={!inputText.trim() && !pendingAttachment}
					>
						<Ionicons
							name="send"
							size={20}
							color={inputText.trim() || pendingAttachment ? COLORS.white : COLORS.gray400}
						/>
					</TouchableOpacity>
				</View>

				{/* 안전 영역 패딩 (하단) */}
				<View style={{ height: Platform.OS === "ios" ? 20 : 8 }} />
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// ── 스타일 ──

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.gray50 },

	// 상단 바
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		backgroundColor: COLORS.white,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	topBarCenter: { flexDirection: "row", alignItems: "center", flex: 1, marginLeft: SPACING.md },
	topAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
		marginRight: SPACING.sm,
	},
	topBarName: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
	topBarStatus: { fontSize: 11, color: COLORS.gray400 },

	// 채팅 영역
	chatArea: { flex: 1 },
	messageList: {
		paddingHorizontal: SPACING.lg,
		paddingTop: SPACING.md,
		paddingBottom: SPACING.sm,
	},

	// 시스템 메시지
	systemMsgWrap: {
		alignItems: "center",
		paddingVertical: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	systemMsgText: {
		fontSize: 12,
		color: COLORS.gray400,
		textAlign: "center",
		backgroundColor: COLORS.gray100,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs + 2,
		borderRadius: RADIUS.full,
		overflow: "hidden",
		lineHeight: 17,
	},

	// 메시지 행
	msgRow: { flexDirection: "row", marginBottom: SPACING.md, maxWidth: "85%" },
	msgRowUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
	msgAvatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
		marginTop: 4,
	},
	msgContent: { marginHorizontal: SPACING.sm, flexShrink: 1 },
	msgSender: { fontSize: 12, fontWeight: "600", color: COLORS.gray500, marginBottom: 4 },

	// 말풍선
	bubble: { borderRadius: RADIUS.lg, padding: SPACING.md, maxWidth: "100%" },
	bubbleConsultant: {
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderTopLeftRadius: 4,
	},
	bubbleUser: { backgroundColor: COLORS.teal600, borderTopRightRadius: 4 },
	msgText: { fontSize: 14, color: COLORS.gray800, lineHeight: 21 },
	msgTextUser: { color: COLORS.white },
	msgTime: { fontSize: 10, color: COLORS.gray400, marginTop: 4 },
	msgTimeUser: { textAlign: "right" },

	// 말풍선 내 첨부
	attachInBubble: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: "rgba(0,0,0,0.06)",
		padding: SPACING.sm,
		borderRadius: RADIUS.sm,
		marginBottom: SPACING.xs,
	},
	attachName: { fontSize: 13, fontWeight: "600", color: COLORS.gray800 },
	attachSize: { fontSize: 11, color: COLORS.gray500 },

	// 타이핑
	typingWrap: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: SPACING.lg,
		paddingBottom: SPACING.sm,
	},
	typingBubble: {
		flexDirection: "row",
		gap: 4,
		backgroundColor: COLORS.white,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.lg,
		marginLeft: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	typingDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: COLORS.gray400,
	},

	// 첨부 미리보기
	pendingAttach: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginHorizontal: SPACING.lg,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		backgroundColor: COLORS.teal50,
		borderRadius: RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.teal100,
		marginBottom: SPACING.xs,
	},
	pendingAttachName: { fontSize: 13, fontWeight: "600", color: COLORS.teal700 },
	pendingAttachSize: { fontSize: 11, color: COLORS.teal600 },

	// 입력 바
	inputBar: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		backgroundColor: COLORS.white,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray200,
		gap: SPACING.xs,
	},
	attachBtn: { paddingBottom: 6 },
	inputWrap: {
		flex: 1,
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.lg,
		paddingHorizontal: SPACING.md,
		paddingVertical: Platform.OS === "ios" ? SPACING.sm : 0,
		maxHeight: 120,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	textInput: { fontSize: 15, color: COLORS.gray900, maxHeight: 100 },
	sendBtn: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: COLORS.gray200,
		justifyContent: "center",
		alignItems: "center",
	},
	sendBtnActive: { backgroundColor: COLORS.teal600 },
});

export default TaxConsultantChatScreen;
