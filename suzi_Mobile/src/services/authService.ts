import * as SecureStore from "expo-secure-store";
import { apiClient } from "./apiClient";
import simulationStorage from "./simulationStorage";

export interface ConsentItem {
	consent_type: "PRIVACY_POLICY" | "TERMS_OF_SERVICE" | "MARKETING" | "PARTNER_SHARE";
	granted: boolean;
	version?: string;
}

export interface SignupData {
	email: string;
	password: string;
	name: string;
	birth_date: string; // "YYYY-MM-DD"
	gender: "M" | "F";
	phone?: string;
	consents: ConsentItem[];
}

export interface LoginData {
	email: string;
	password: string;
}

export interface AuthUser {
	id: number;
	email: string;
	name: string;
	birth_date: string; // "YYYY-MM-DD"
	gender: string;
	phone: string | null;
	stage_index: number;
	role: string;
	created_at: string;
}

export interface TokenData {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
}

const TOKEN_KEYS = {
	ACCESS: "access_token",
	REFRESH: "refresh_token",
	USER: "user",
} as const;

/** Full type guard for AuthUser — validates all fields, not just a subset. */
function isValidAuthUser(value: unknown): value is AuthUser {
	if (typeof value !== "object" || value === null) return false;
	const u = value as Record<string, unknown>;
	return (
		typeof u.id === "number" &&
		typeof u.email === "string" &&
		u.email.length > 0 &&
		typeof u.name === "string" &&
		typeof u.birth_date === "string" &&
		/^\d{4}-\d{2}-\d{2}$/.test(u.birth_date as string) &&
		typeof u.gender === "string" &&
		(u.gender === "M" || u.gender === "F") &&
		(u.phone === null || typeof u.phone === "string") &&
		typeof u.stage_index === "number" &&
		typeof u.role === "string" &&
		typeof u.created_at === "string"
	);
}

const authService = {
	async signup(data: SignupData): Promise<AuthUser> {
		const response = await apiClient.post<AuthUser>("/auth/signup", data, false);
		return response.data!;
	},

	async login(data: LoginData): Promise<{ user: AuthUser; tokens: TokenData }> {
		const tokenResponse = await apiClient.post<TokenData>("/auth/login", data, false);
		const tokens = tokenResponse.data!;

		// Save tokens to secure storage
		await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, tokens.access_token);
		await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, tokens.refresh_token);

		// Fetch user profile
		const userResponse = await apiClient.get<AuthUser>("/api/users/me");
		const user = userResponse.data!;
		await SecureStore.setItemAsync(TOKEN_KEYS.USER, JSON.stringify(user));

		return { user, tokens };
	},

	async logout(): Promise<void> {
		try {
			const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
			if (refreshToken) {
				await apiClient.post("/auth/logout", {
					refresh_token: refreshToken,
				});
			}
		} catch {} // Ignore logout API errors
		await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
		await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
		await SecureStore.deleteItemAsync(TOKEN_KEYS.USER);
	},

	async getStoredUser(): Promise<AuthUser | null> {
		const userStr = await SecureStore.getItemAsync(TOKEN_KEYS.USER);
		if (!userStr) return null;
		try {
			const user = JSON.parse(userStr);
			// Validate ALL required fields to prevent corrupted/tampered data
			if (!isValidAuthUser(user)) {
				await SecureStore.deleteItemAsync(TOKEN_KEYS.USER);
				return null;
			}
			return user;
		} catch {
			await SecureStore.deleteItemAsync(TOKEN_KEYS.USER);
			return null;
		}
	},

	async getStoredToken(): Promise<string | null> {
		const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
		if (!token) return null;

		// Basic JWT expiration check (without full decode)
		try {
			const parts = token.split(".");
			if (parts.length !== 3) return null;
			const payload = JSON.parse(atob(parts[1]));
			if (payload.exp && payload.exp * 1000 < Date.now()) {
				// Token expired — clear it
				await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
				return null;
			}
		} catch {
			// If we can't parse, let the server validate
		}

		return token;
	},

	async updateProfile(data: { name?: string; phone?: string; stage_index?: number }): Promise<AuthUser> {
		const response = await apiClient.patch<AuthUser>("/api/users/me", data);
		const user = response.data!;
		await SecureStore.setItemAsync(TOKEN_KEYS.USER, JSON.stringify(user));
		return user;
	},

	async deleteAccount(): Promise<void> {
		// 삭제 전 userId 확보 (로컬 캐시 정리용)
		let userId: string | number | null = null;
		try {
			const userJson = await SecureStore.getItemAsync(TOKEN_KEYS.USER);
			if (userJson) {
				const parsed = JSON.parse(userJson);
				userId = parsed?.id ?? null;
			}
		} catch { /* ignore */ }

		await apiClient.delete("/auth/account");
		await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
		await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
		await SecureStore.deleteItemAsync(TOKEN_KEYS.USER);
		// Clear all local cached data on account deletion
		if (userId) {
			await simulationStorage.clear(userId);
		}
	},
};

export default authService;
