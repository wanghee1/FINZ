/**
 * AI 챗봇 플로팅 액션 버튼 (FAB)
 *
 * 모든 인증 화면에 표시되는 AI 챗봇 진입점
 * - 플로팅 버튼 (우하단)
 * - 안읽은 메시지 뱃지
 * - 펄스 애니메이션
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, View, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../theme";
import { useAIChat } from "../context/AIChatContext";

const FAB_SIZE = 56;
const BADGE_SIZE = 18;

const AIChatFAB = () => {
	const { toggleChat, isOpen, hasUnread } = useAIChat();
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;

	// 등장 애니메이션
	useEffect(() => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 6,
			tension: 80,
			useNativeDriver: true,
		}).start();
	}, [scaleAnim]);

	// 안읽은 메시지 펄스 애니메이션
	useEffect(() => {
		if (hasUnread) {
			const pulse = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.15,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			);
			pulse.start();
			return () => pulse.stop();
		} else {
			pulseAnim.setValue(1);
		}
	}, [hasUnread, pulseAnim]);

	if (isOpen) return null;

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
				},
			]}
		>
			<TouchableOpacity style={styles.fab} onPress={toggleChat} activeOpacity={0.8}>
				<View style={styles.iconWrap}>
					<Ionicons name="sparkles" size={26} color={COLORS.white} />
				</View>
			</TouchableOpacity>

			{/* 안읽은 메시지 뱃지 */}
			{hasUnread && <View style={styles.badge} />}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		right: 20,
		bottom: Platform.OS === "ios" ? 110 : 90,
		zIndex: 998,
	},
	fab: {
		width: FAB_SIZE,
		height: FAB_SIZE,
		borderRadius: FAB_SIZE / 2,
		backgroundColor: COLORS.teal600,
		justifyContent: "center",
		alignItems: "center",
		// 그림자
		...Platform.select({
			ios: {
				shadowColor: COLORS.teal800,
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 8,
			},
			android: {
				elevation: 8,
			},
		}),
	},
	iconWrap: {
		justifyContent: "center",
		alignItems: "center",
	},
	badge: {
		position: "absolute",
		top: -2,
		right: -2,
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: BADGE_SIZE / 2,
		backgroundColor: COLORS.red500,
		borderWidth: 2,
		borderColor: COLORS.white,
	},
});

export default AIChatFAB;
