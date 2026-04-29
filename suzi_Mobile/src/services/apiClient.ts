import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api.config";

interface ApiResponse<T> {
	status: "success" | "error";
	data?: T;
	message?: string;
	code?: string;
}

interface PaginatedData<T> {
	status: "success";
	data: T[];
	total: number;
	page: number;
	page_size: number;
	total_pages: number;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max response

class ApiClient {
	private baseUrl: string;
	private refreshPromise: Promise<boolean> | null = null;

	constructor() {
		this.baseUrl = API_BASE_URL;
	}

	private async getToken(): Promise<string | null> {
		return SecureStore.getItemAsync("access_token");
	}

	private async request<T>(method: string, path: string, body?: any, requireAuth: boolean = true, timeoutMs?: number): Promise<T> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (requireAuth) {
			const token = await this.getToken();
			if (token) {
				headers["Authorization"] = `Bearer ${token}`;
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);

		const config: RequestInit = { method, headers, signal: controller.signal };
		if (body && method !== "GET") {
			config.body = JSON.stringify(body);
		}

		const url = `${this.baseUrl}${path}`;

		try {
			const response = await fetch(url, config);

			if (response.status === 401) {
				// Try to refresh token
				const refreshed = await this.tryRefreshToken();
				if (refreshed) {
					// Retry the original request
					const newToken = await this.getToken();
					headers["Authorization"] = `Bearer ${newToken}`;
					const retryResponse = await fetch(url, { ...config, headers });
					if (!retryResponse.ok) {
						throw await this.parseError(retryResponse);
					}
					return retryResponse.json();
				}
				// Refresh failed, clear tokens
				await this.clearTokens();
				throw {
					code: "UNAUTHORIZED",
					message: "인증이 만료되었습니다. 다시 로그인해주세요.",
				};
			}

			if (!response.ok) {
				throw await this.parseError(response);
			}

			// Guard against oversized responses
			const contentLength = response.headers.get("content-length");
			if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE_BYTES) {
				throw { code: "RESPONSE_TOO_LARGE", message: "응답 데이터가 너무 큽니다." };
			}

			return response.json();
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async parseError(response: Response) {
		try {
			const data = await response.json();
			// Extract validation error detail from FastAPI 422 responses
			let message = data.message || data.detail || "오류가 발생했습니다";
			if (Array.isArray(data.detail)) {
				message = data.detail.map((d: any) => d.msg || d.message).join(", ");
			}
			return {
				status: response.status,
				code: data.code || "ERROR",
				message,
			};
		} catch {
			return { status: response.status, code: "ERROR", message: `HTTP ${response.status}` };
		}
	}

	private async tryRefreshToken(): Promise<boolean> {
		// Mutex: if a refresh is already in-flight, queue behind it
		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = this._doRefreshToken();
		try {
			return await this.refreshPromise;
		} finally {
			this.refreshPromise = null;
		}
	}

	private async _doRefreshToken(): Promise<boolean> {
		const refreshToken = await SecureStore.getItemAsync("refresh_token");
		if (!refreshToken) return false;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const response = await fetch(`${this.baseUrl}/auth/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ refresh_token: refreshToken }),
				signal: controller.signal,
			});
			if (response.ok) {
				const data = await response.json();
				await SecureStore.setItemAsync("access_token", data.data.access_token);
				await SecureStore.setItemAsync("refresh_token", data.data.refresh_token);
				return true;
			}
		} catch {
			// Refresh failed silently
		} finally {
			clearTimeout(timeoutId);
		}
		return false;
	}

	private async clearTokens() {
		await SecureStore.deleteItemAsync("access_token");
		await SecureStore.deleteItemAsync("refresh_token");
		await SecureStore.deleteItemAsync("user");
	}

	// Public methods
	async get<T>(path: string, requireAuth = true, timeoutMs?: number): Promise<ApiResponse<T>> {
		return this.request<ApiResponse<T>>("GET", path, undefined, requireAuth, timeoutMs);
	}

	async post<T>(path: string, body?: any, requireAuth = true, timeoutMs?: number): Promise<ApiResponse<T>> {
		return this.request<ApiResponse<T>>("POST", path, body, requireAuth, timeoutMs);
	}

	async patch<T>(path: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
		return this.request<ApiResponse<T>>("PATCH", path, body, requireAuth);
	}

	async delete<T>(path: string, requireAuth = true): Promise<ApiResponse<T>> {
		return this.request<ApiResponse<T>>("DELETE", path, undefined, requireAuth);
	}

	async getPaginated<T>(path: string): Promise<PaginatedData<T>> {
		return this.request<PaginatedData<T>>("GET", path);
	}
}

export const apiClient = new ApiClient();
export type { ApiResponse, PaginatedData };
