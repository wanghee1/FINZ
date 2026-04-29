// API configuration for different environments
import { Platform } from "react-native";
import Constants from "expo-constants";

// Expo가 자동 감지한 개발 서버 IP를 재사용 — 수동 IP 관리 불필요
const EXPO_HOST_IP = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

const ENV = {
	dev: {
		android: `http://10.0.2.2:8000`,
		ios: `http://${EXPO_HOST_IP}:8000`,
		web: `http://localhost:8000`,
	},
	staging: { apiUrl: "https://staging-api.finz.co.kr" },
	prod: { apiUrl: "https://api.finz.co.kr" },
};

function getDevUrl(): string {
	if (Platform.OS === "android") return ENV.dev.android;
	if (Platform.OS === "ios") return ENV.dev.ios;
	return ENV.dev.web;
}

export const API_BASE_URL = __DEV__ ? getDevUrl() : ENV.prod.apiUrl;

// Security: ensure production URL uses HTTPS
if (!__DEV__ && !API_BASE_URL.startsWith("https://")) {
	throw new Error("Production API must use HTTPS");
}
