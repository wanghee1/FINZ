/**
 * AI 챗봇 슬라이드업 채팅 패널
 *
 * 하단에서 슬라이드업되는 채팅 인터페이스
 * - AI/사용자 메시지 버블
 * - 화면별 맥락형 추천 질문 칩
 * - 타이핑 애니메이션
 * - 면책 조항 표시
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	FlatList,
	Animated,
	Dimensions,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";
import { useAIChat } from "../context/AIChatContext";
import type { AIChatMessage } from "../context/AIChatContext";
import {
	SCREEN_AI_CONTEXTS,
	QUESTION_CATEGORY_ICONS,
	AI_CHAT_CONFIG,
} from "../constants/aiChatConstants";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.75;
const HEADER_HEIGHT = 56;

const AIChatPanel = () => {
	const {
		isOpen,
		closeChat,
		screenContext,
		messages,
		sendMessage,
		isTyping,
		clearMessages,
	} = useAIChat();

	const [inputText, setInputText] = useState("");
	const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
	const overlayAnim = useRef(new Animated.Value(0)).current;
	const flatListRef = useRef<FlatList>(null);
	const typingDots = useRef(new Animated.Value(0)).current;

	const ctx = SCREEN_AI_CONTEXTS[screenContext] || SCREEN_AI_CONTEXTS.default;

	// 패널 열기/닫기 애니메이션
	useEffect(() => {
		if (isOpen) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					friction: 9,
					tension: 65,
					useNativeDriver: true,
				}),
				Animated.timing(overlayAnim, {
					toValue: 1,
					duration: 250,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: PANEL_HEIGHT,
					duration: 250,
					useNativeDriver: true,
				}),
				Animated.timing(overlayAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [isOpen, slideAnim, overlayAnim]);

	// 타이핑 애니메이션
	useEffect(() => {
		if (isTyping) {
			const loop = Animated.loop(
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
			);
			loop.start();
			return () => loop.stop();
		} else {
			typingDots.setValue(0);
		}
	}, [isTyping, typingDots]);

	// 새 메시지 시 스크롤
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages.length, isTyping]);

	// 메시지 전송
	const handleSend = useCallback(() => {
		const trimmed = inputText.trim();
		if (!trimmed) return;
		sendMessage(trimmed);
		setInputText("");
	}, [inputText, sendMessage]);

	// 추천 질문 탭
	const handleSuggestedQuestion = useCallback(
		(text: string) => {
			sendMessage(text);
		},
		[sendMessage],
	);

	// 시간 포맷
	const formatTime = (iso: string) => {
		const d = new Date(iso);
		const h = d.getHours();
		const m = d.getMinutes().toString().padStart(2, "0");
		const period = h < 12 ? "오전" : "오후";
		const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return `${period} ${hour12}:${m}`;
	};

	// ── 메시지 렌더 ──
	const renderMessage = ({ item }: { item: AIChatMessage }) => {
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
				{/* AI 아바타 */}
				{!isUser && (
					<View style={styles.aiAvatar}>
						<Ionicons name="sparkles" size={14} color={COLORS.white} />
					</View>
				)}

				<View style={styles.msgContent}>
					{!isUser && <Text style={styles.msgSender}>{AI_CHAT_CONFIG.botName}</Text>}
					<View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
						<Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
					</View>
					<Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>
						{formatTime(item.timestamp)}
					</Text>
				</View>
			</View>
		);
	};

	// ── 추천 질문 영역 ──
	const renderSuggestedQuestions = () => {
		if (messages.length > 3) return null;

		return (
			<View style={styles.suggestionsWrap}>
				<Text style={styles.suggestionsTitle}>이런 것을 물어보세요</Text>
				{ctx.suggestedQuestions.map((q) => (
					<TouchableOpacity
						key={q.id}
						style={styles.suggestionChip}
						onPress={() => handleSuggestedQuestion(q.text)}
						activeOpacity={0.7}
					>
						<Ionicons
							name={QUESTION_CATEGORY_ICONS[q.category] as any}
							size={16}
							color={COLORS.teal600}
						/>
						<Text style={styles.suggestionText}>{q.text}</Text>
						<Ionicons name="arrow-forward" size={14} color={COLORS.gray400} />
					</TouchableOpacity>
				))}
			</View>
		);
	};

	if (!isOpen) return null;

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			{/* 오버레이 */}
			<Animated.View
				style={[styles.overlay, { opacity: overlayAnim }]}
				pointerEvents={isOpen ? "auto" : "none"}
			>
				<TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeChat} activeOpacity={1} />
			</Animated.View>

			{/* 패널 */}
			<Animated.View
				style={[
					styles.panel,
					{ transform: [{ translateY: slideAnim }] },
				]}
			>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					keyboardVerticalOffset={SCREEN_HEIGHT - PANEL_HEIGHT}
				>
					{/* 헤더 */}
					<View style={styles.header}>
						<View style={styles.headerHandle} />
						<View style={styles.headerRow}>
							<View style={styles.headerLeft}>
								<View style={styles.headerAvatar}>
									<Ionicons name="sparkles" size={16} color={COLORS.white} />
								</View>
								<View>
									<Text style={styles.headerTitle}>{AI_CHAT_CONFIG.botName}</Text>
									<Text style={styles.headerSubtitle}>맥락형 AI 도우미</Text>
								</View>
							</View>
							<View style={styles.headerActions}>
								<TouchableOpacity
									onPress={clearMessages}
									style={styles.headerBtn}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="refresh-outline" size={20} color={COLORS.gray500} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={closeChat}
									style={styles.headerBtn}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="close" size={22} color={COLORS.gray500} />
								</TouchableOpacity>
							</View>
						</View>
					</View>

					{/* 메시지 영역 */}
					<FlatList
						ref={flatListRef}
						data={messages}
						keyExtractor={(item) => item.id}
						renderItem={renderMessage}
						contentContainerStyle={styles.messageList}
						ListFooterComponent={
							<>
								{/* 타이핑 인디케이터 */}
								{isTyping && (
									<View style={styles.typingWrap}>
										<View style={styles.aiAvatar}>
											<Ionicons name="sparkles" size={14} color={COLORS.white} />
										</View>
										<View style={styles.typingBubble}>
											<Animated.View style={[styles.typingDot, { opacity: typingDots }]} />
											<Animated.View
												style={[
													styles.typingDot,
													{
														opacity: Animated.multiply(
															typingDots,
															new Animated.Value(0.7),
														),
													},
												]}
											/>
											<Animated.View
												style={[
													styles.typingDot,
													{
														opacity: Animated.multiply(
															typingDots,
															new Animated.Value(0.4),
														),
													},
												]}
											/>
										</View>
									</View>
								)}

								{/* 추천 질문 */}
								{renderSuggestedQuestions()}
							</>
						}
						onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
					/>

					{/* 면책 조항 */}
					<View style={styles.disclaimerBar}>
						<Ionicons name="information-circle-outline" size={12} color={COLORS.gray400} />
						<Text style={styles.disclaimerText}>{AI_CHAT_CONFIG.disclaimer}</Text>
					</View>

					{/* 입력 영역 */}
					<View style={styles.inputBar}>
						<View style={styles.inputWrap}>
							<TextInput
								style={styles.textInput}
								placeholder="궁금한 점을 물어보세요..."
								placeholderTextColor={COLORS.gray400}
								value={inputText}
								onChangeText={setInputText}
								multiline
								maxLength={500}
								onSubmitEditing={handleSend}
								returnKeyType="send"
							/>
						</View>
						<TouchableOpacity
							style={[styles.sendBtn, inputText.trim() ? styles.sendBtnActive : {}]}
							onPress={handleSend}
							disabled={!inputText.trim()}
						>
							<Ionicons
								name="send"
								size={18}
								color={inputText.trim() ? COLORS.white : COLORS.gray400}
							/>
						</TouchableOpacity>
					</View>

					{/* 하단 세이프에어리어 */}
					<View style={{ height: Platform.OS === "ios" ? 20 : 8 }} />
				</KeyboardAvoidingView>
			</Animated.View>
		</View>
	);
};

// ── 스타일 ──

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.4)",
		zIndex: 999,
	},

	panel: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: PANEL_HEIGHT,
		backgroundColor: COLORS.white,
		borderTopLeftRadius: RADIUS.xl,
		borderTopRightRadius: RADIUS.xl,
		zIndex: 1000,
		...Platform.select({
			ios: {
				shadowColor: COLORS.black,
				shadowOffset: { width: 0, height: -4 },
				shadowOpacity: 0.15,
				shadowRadius: 12,
			},
			android: {
				elevation: 16,
			},
		}),
	},

	// 헤더
	header: {
		paddingTop: SPACING.sm,
		paddingBottom: SPACING.md,
		paddingHorizontal: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	headerHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: COLORS.gray300,
		alignSelf: "center",
		marginBottom: SPACING.md,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
	},
	headerAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.gray900,
	},
	headerSubtitle: {
		fontSize: 12,
		color: COLORS.gray500,
		marginTop: 1,
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
	},
	headerBtn: {
		padding: 4,
	},

	// 메시지 리스트
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
	msgRow: {
		flexDirection: "row",
		marginBottom: SPACING.md,
		maxWidth: "85%",
	},
	msgRowUser: {
		alignSelf: "flex-end",
		flexDirection: "row-reverse",
	},
	aiAvatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
		marginTop: 4,
	},
	msgContent: {
		marginHorizontal: SPACING.sm,
		flexShrink: 1,
	},
	msgSender: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.teal700,
		marginBottom: 4,
	},

	// 말풍선
	bubble: {
		borderRadius: RADIUS.lg,
		padding: SPACING.md,
		maxWidth: "100%",
	},
	bubbleAI: {
		backgroundColor: COLORS.gray50,
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderTopLeftRadius: 4,
	},
	bubbleUser: {
		backgroundColor: COLORS.teal600,
		borderTopRightRadius: 4,
	},
	msgText: {
		fontSize: 14,
		color: COLORS.gray800,
		lineHeight: 21,
	},
	msgTextUser: {
		color: COLORS.white,
	},
	msgTime: {
		fontSize: 10,
		color: COLORS.gray400,
		marginTop: 4,
	},
	msgTimeUser: {
		textAlign: "right",
	},

	// 타이핑
	typingWrap: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: SPACING.sm,
	},
	typingBubble: {
		flexDirection: "row",
		gap: 4,
		backgroundColor: COLORS.gray50,
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
		backgroundColor: COLORS.teal600,
	},

	// 추천 질문
	suggestionsWrap: {
		paddingTop: SPACING.md,
		paddingBottom: SPACING.sm,
	},
	suggestionsTitle: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray500,
		marginBottom: SPACING.sm,
	},
	suggestionChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		backgroundColor: COLORS.teal50,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.md,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.sm,
		borderWidth: 1,
		borderColor: COLORS.teal100,
	},
	suggestionText: {
		flex: 1,
		fontSize: 14,
		color: COLORS.teal800,
		lineHeight: 20,
	},

	// 면책 조항
	disclaimerBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.xs,
		backgroundColor: COLORS.gray50,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray100,
	},
	disclaimerText: {
		fontSize: 10,
		color: COLORS.gray400,
		flex: 1,
		lineHeight: 14,
	},

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
	inputWrap: {
		flex: 1,
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.lg,
		paddingHorizontal: SPACING.md,
		paddingVertical: Platform.OS === "ios" ? SPACING.sm : 0,
		maxHeight: 100,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	textInput: {
		fontSize: 15,
		color: COLORS.gray900,
		maxHeight: 80,
	},
	sendBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: COLORS.gray200,
		justifyContent: "center",
		alignItems: "center",
	},
	sendBtnActive: {
		backgroundColor: COLORS.teal600,
	},
});

export default AIChatPanel;
