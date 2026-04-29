import { apiClient } from "./apiClient";

const track2Service = {
	async createSimulation(title?: string) {
		return apiClient.post("/api/task2/simulations", { title });
	},

	async listSimulations(page = 1, pageSize = 10, status?: string) {
		let path = `/api/task2/simulations?page=${page}&page_size=${pageSize}`;
		if (status) path += `&status=${status}`;
		return apiClient.getPaginated(path);
	},

	async getSimulation(simulationId: string) {
		return apiClient.get(`/api/task2/simulations/${simulationId}`);
	},

	async updateInputs(simulationId: string, inputs: Record<string, any>) {
		return apiClient.patch(`/api/task2/simulations/${simulationId}/inputs`, inputs);
	},

	async searchRealtrade(lawdCd: string, dealYmd: string) {
		return apiClient.get(`/api/task2/realtrade?lawd_cd=${lawdCd}&deal_ymd=${dealYmd}`);
	},

	async getRegions() {
		return apiClient.get("/api/task2/realtrade/regions", false);
	},

	async searchApartments(lawdCd: string, keyword: string = "", endYm: string = "") {
		let path = `/api/task2/realtrade/search?lawd_cd=${lawdCd}`;
		if (keyword) path += `&keyword=${encodeURIComponent(keyword)}`;
		if (endYm) path += `&end_ym=${endYm}`;
		return apiClient.get(path, true, 120_000); // 6개월 데이터 조회는 시간이 걸릴 수 있음
	},

	async selectRealtrade(simulationId: string, data: { target: "A" | "B"; trade_id: string; applied_price: number }) {
		return apiClient.post(`/api/task2/simulations/${simulationId}/realtrade/select`, data);
	},

	async calculate(simulationId: string, policyDate?: string) {
		return apiClient.post(`/api/task2/simulations/${simulationId}/calculate`, { policy_date: policyDate });
	},

	async getResult(simulationId: string) {
		return apiClient.get(`/api/task2/simulations/${simulationId}/result`);
	},

	async generateAiSummary(simulationId: string, tone = "SHORT", focus?: number[]) {
		return apiClient.post(`/api/task2/simulations/${simulationId}/ai-summary`, { tone, focus });
	},

	async deleteSimulation(simulationId: string) {
		return apiClient.delete(`/api/task2/simulations/${simulationId}`);
	},

	async getPolicy() {
		return apiClient.get("/api/task2/policy", false);
	},

	async recalculate(simulationId: string, policyDate?: string) {
		return apiClient.post(`/api/task2/simulations/${simulationId}/recalculate`, { policy_date: policyDate });
	},
};

export default track2Service;
