/**
 * 공용 포맷팅 유틸리티
 * 금액, 비율 등의 표시 형식을 통일하기 위한 함수 모음
 */

/** 원화 표시 (예: 3,633,300원) */
export const formatCurrency = (won: number): string => {
	return won.toLocaleString("ko-KR") + "원";
};

/** 한국어 금액 표시 (예: 15억원, 3억 2,000만원) */
export const formatKorean = (won: number): string => {
	if (won === 0) return "0원";

	const abs = Math.abs(won);
	const sign = won < 0 ? "-" : "";
	const eok = Math.floor(abs / 100_000_000);
	const man = Math.floor((abs % 100_000_000) / 10_000);

	if (eok > 0 && man > 0) {
		return `${sign}${eok}억 ${man.toLocaleString()}만원`;
	}
	if (eok > 0) return `${sign}${eok}억원`;
	if (man > 0) return `${sign}${man.toLocaleString()}만원`;
	return `${sign}${abs.toLocaleString()}원`;
};

/** 억원 문자열을 원 단위로 변환 */
export const eokToWon = (eok: string): number => {
	const num = parseFloat(eok);
	return isNaN(num) ? 0 : Math.round(num * 100_000_000);
};

/** 원화 표시 (0원 처리 포함, 예: 3,633,300원) */
export const formatWon = (won: number): string => {
	if (won === 0) return "0원";
	return won.toLocaleString("ko-KR") + "원";
};

/** 변동률 표시 (예: +3.5%, -1.2%) */
export const formatRate = (rate: number): string => {
	if (rate === 0) return "0%";
	return `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`;
};

/** 상담료 표시 (0원이면 "무료") */
export const formatFee = (fee: number): string => {
	return fee === 0 ? "무료" : `${fee.toLocaleString("ko-KR")}원`;
};

/** 시간 포맷 (ISO → "오전 10:30") */
export const formatTime = (iso: string): string => {
	const d = new Date(iso);
	const h = d.getHours();
	const m = d.getMinutes().toString().padStart(2, "0");
	const period = h < 12 ? "오전" : "오후";
	const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${period} ${hour12}:${m}`;
};
