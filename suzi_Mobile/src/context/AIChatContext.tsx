/**
 * AI 챗봇 상태 관리 Context
 *
 * - 채팅 패널 열기/닫기
 * - 현재 화면 컨텍스트 관리
 * - 메시지 히스토리 관리
 * - 목업 AI 응답 처리
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
	ScreenContextKey,
	SCREEN_AI_CONTEXTS,
	AI_MOCK_RESPONSES,
	AI_GENERAL_RESPONSES,
	AI_CHAT_CONFIG,
} from "../constants/aiChatConstants";

// ── 타입 ──

export type AIChatSender = "user" | "ai" | "system";

export interface AIChatMessage {
	id: string;
	sender: AIChatSender;
	text: string;
	timestamp: string;
}

interface AIChatContextType {
	/** 패널 열림 여부 */
	isOpen: boolean;
	/** 패널 열기 */
	openChat: () => void;
	/** 패널 닫기 */
	closeChat: () => void;
	/** 패널 토글 */
	toggleChat: () => void;
	/** 현재 화면 컨텍스트 키 */
	screenContext: ScreenContextKey;
	/** 화면 컨텍스트 업데이트 */
	setScreenContext: (key: ScreenContextKey) => void;
	/** 메시지 목록 */
	messages: AIChatMessage[];
	/** 메시지 전송 */
	sendMessage: (text: string) => void;
	/** AI 타이핑 중 여부 */
	isTyping: boolean;
	/** 대화 초기화 */
	clearMessages: () => void;
	/** 새 메시지 알림 뱃지 */
	hasUnread: boolean;
	/** 안읽은 메시지 읽음 처리 */
	markAsRead: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

// ── Provider ──

export const AIChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [screenContext, setScreenContext] = useState<ScreenContextKey>("default");
	const [messages, setMessages] = useState<AIChatMessage[]>([]);
	const [isTyping, setIsTyping] = useState(false);
	const [hasUnread, setHasUnread] = useState(false);
	const [hasShownGreeting, setHasShownGreeting] = useState(false);
	const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const addMessage = useCallback((sender: AIChatSender, text: string) => {
		const msg: AIChatMessage = {
			id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			sender,
			text,
			timestamp: new Date().toISOString(),
		};
		setMessages((prev) => {
			const next = [...prev, msg];
			if (next.length > AI_CHAT_CONFIG.maxMessages) {
				return next.slice(next.length - AI_CHAT_CONFIG.maxMessages);
			}
			return next;
		});
		return msg;
	}, []);

	const getAIResponse = useCallback((userText: string): string => {
		// 정확히 매칭되는 응답 확인
		const exactMatch = AI_MOCK_RESPONSES[userText];
		if (exactMatch) {
			return exactMatch[Math.floor(Math.random() * exactMatch.length)];
		}

		// 부분 매칭 시도
		for (const [key, responses] of Object.entries(AI_MOCK_RESPONSES)) {
			if (userText.includes(key) || key.includes(userText)) {
				return responses[Math.floor(Math.random() * responses.length)];
			}
		}

		// 일반 응답
		return AI_GENERAL_RESPONSES[Math.floor(Math.random() * AI_GENERAL_RESPONSES.length)];
	}, []);

	const sendMessage = useCallback(
		(text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;

			// 사용자 메시지 추가
			addMessage("user", trimmed);

			// AI 타이핑 시뮬레이션
			setIsTyping(true);
			const delay =
				AI_CHAT_CONFIG.typingDelay.min +
				Math.random() * (AI_CHAT_CONFIG.typingDelay.max - AI_CHAT_CONFIG.typingDelay.min);

			if (typingTimerRef.current) {
				clearTimeout(typingTimerRef.current);
			}

			typingTimerRef.current = setTimeout(() => {
				setIsTyping(false);
				const response = getAIResponse(trimmed);
				addMessage("ai", response);

				// 패널이 닫혀있으면 알림 뱃지
				setIsOpen((open) => {
					if (!open) setHasUnread(true);
					return open;
				});
			}, delay);
		},
		[addMessage, getAIResponse],
	);

	const openChat = useCallback(() => {
		setIsOpen(true);
		setHasUnread(false);

		// 첫 열기 시 인사 메시지
		if (!hasShownGreeting) {
			const ctx = SCREEN_AI_CONTEXTS[screenContext] || SCREEN_AI_CONTEXTS.default;
			addMessage("ai", `${ctx.greeting}\n\n${ctx.description}\n\n${AI_CHAT_CONFIG.disclaimer}`);
			setHasShownGreeting(true);
		}
	}, [hasShownGreeting, screenContext, addMessage]);

	const closeChat = useCallback(() => {
		setIsOpen(false);
	}, []);

	const toggleChat = useCallback(() => {
		if (isOpen) {
			closeChat();
		} else {
			openChat();
		}
	}, [isOpen, openChat, closeChat]);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setHasShownGreeting(false);
		if (typingTimerRef.current) {
			clearTimeout(typingTimerRef.current);
		}
		setIsTyping(false);
	}, []);

	const markAsRead = useCallback(() => {
		setHasUnread(false);
	}, []);

	return (
		<AIChatContext.Provider
			value={{
				isOpen,
				openChat,
				closeChat,
				toggleChat,
				screenContext,
				setScreenContext,
				messages,
				sendMessage,
				isTyping,
				clearMessages,
				hasUnread,
				markAsRead,
			}}
		>
			{children}
		</AIChatContext.Provider>
	);
};

// ── Hook ──

export const useAIChat = (): AIChatContextType => {
	const ctx = useContext(AIChatContext);
	if (!ctx) {
		throw new Error("useAIChat must be used within AIChatProvider");
	}
	return ctx;
};
