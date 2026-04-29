/**
 * 시뮬레이션 결과 로컬 저장 서비스
 * AsyncStorage 기반, 최대 50개, 최신순 정렬
 * 사용자별 격리: 스토리지 키에 userId 포함
 *
 * Security notes:
 * - AsyncStorage is used for non-sensitive simulation cache data only
 * - All auth tokens and PII are stored in expo-secure-store instead
 * - Data is validated on read to prevent corrupted/tampered data
 * - Storage is scoped per user to prevent cross-user data leakage
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "@suzihouse/saved_simulations";
const MAX_ENTRIES = 50;
const MAX_ENTRY_SIZE_BYTES = 512 * 1024; // 512KB per serialized list

/** 사용자별 스토리지 키 생성 */
function getStorageKey(userId: string | number): string {
	return `${STORAGE_KEY_PREFIX}_${userId}`;
}

export interface SavedSimulationEntry {
	id: string;
	type: "youth_tax" | "property";
	title: string;
	summary: string;
	createdAt: string;
	data: Record<string, unknown> | object;
}

const VALID_TYPES = new Set(["youth_tax", "property"]);

/** Validate a single entry's shape to guard against corrupted storage. */
function isValidEntry(entry: unknown): entry is SavedSimulationEntry {
	if (typeof entry !== "object" || entry === null) return false;
	const e = entry as Record<string, unknown>;
	return (
		typeof e.id === "string" &&
		e.id.length > 0 &&
		e.id.length <= 100 &&
		typeof e.type === "string" &&
		VALID_TYPES.has(e.type) &&
		typeof e.title === "string" &&
		e.title.length <= 500 &&
		typeof e.summary === "string" &&
		typeof e.createdAt === "string" &&
		e.data !== null &&
		typeof e.data === "object"
	);
}

const getAll = async (userId: string | number): Promise<SavedSimulationEntry[]> => {
	if (!userId) return [];
	try {
		const raw = await AsyncStorage.getItem(getStorageKey(userId));
		if (!raw) return [];

		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			// Corrupted data — reset
			await AsyncStorage.removeItem(getStorageKey(userId));
			return [];
		}

		// Filter out any invalid entries (corrupted or tampered)
		return parsed.filter(isValidEntry);
	} catch {
		return [];
	}
};

const save = async (userId: string | number, entry: SavedSimulationEntry): Promise<void> => {
	if (!userId) return;
	if (!isValidEntry(entry)) {
		throw new Error("Invalid simulation entry");
	}

	const list = await getAll(userId);
	// 같은 id가 있으면 교체
	const idx = list.findIndex((e) => e.id === entry.id);
	if (idx >= 0) {
		list[idx] = entry;
	} else {
		list.unshift(entry);
	}
	// 최대 개수 제한
	const trimmed = list.slice(0, MAX_ENTRIES);

	const key = getStorageKey(userId);
	const serialized = JSON.stringify(trimmed);
	if (serialized.length > MAX_ENTRY_SIZE_BYTES) {
		// If too large, keep fewer entries
		const reduced = trimmed.slice(0, Math.max(1, Math.floor(MAX_ENTRIES / 2)));
		await AsyncStorage.setItem(key, JSON.stringify(reduced));
		return;
	}

	await AsyncStorage.setItem(key, serialized);
};

const remove = async (userId: string | number, id: string): Promise<void> => {
	if (!userId || typeof id !== "string" || id.length === 0) return;
	const list = await getAll(userId);
	const filtered = list.filter((e) => e.id !== id);
	await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(filtered));
};

const clear = async (userId: string | number): Promise<void> => {
	if (!userId) return;
	await AsyncStorage.removeItem(getStorageKey(userId));
};

export default { getAll, save, remove, clear };
