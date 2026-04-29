/**
 * 화면별 AI 챗봇 컨텍스트 자동 설정 훅
 *
 * 각 화면에서 import하여 사용하면,
 * 해당 화면에 진입할 때 자동으로 AI 챗봇의 컨텍스트가 변경됩니다.
 */

import { useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAIChat } from "../context/AIChatContext";
import type { ScreenContextKey } from "../constants/aiChatConstants";

/**
 * 화면 진입 시 AI 챗봇 컨텍스트를 자동 설정
 * @param contextKey - 해당 화면의 컨텍스트 키
 */
export const useAIChatScreen = (contextKey: ScreenContextKey) => {
	const { setScreenContext } = useAIChat();

	useFocusEffect(
		useCallback(() => {
			setScreenContext(contextKey);
		}, [contextKey, setScreenContext]),
	);
};
