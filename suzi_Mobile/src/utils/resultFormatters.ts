/**
 * 결과 공유 텍스트 & PDF HTML 생성 유틸리티
 */
import { YouthTaxResult } from "../types";
import { SixWayResult, ScenarioResult } from "../screens/track2/types";
import { formatCurrency, formatKorean } from "./formatters";

// ── 공유 텍스트 ──────────────────────────────

export const formatTrack1ShareText = (result: YouthTaxResult): string => {
	const lines: string[] = [
		"[FINZ] 청년 소득세 감면 시뮬레이션 결과",
		"",
		`대상 여부: ${result.eligibility.isEligible ? "대상" : "비대상"}`,
	];

	if (result.eligibility.isEligible) {
		lines.push(
			`예상 환급액: ${formatCurrency(result.totalRefundEstimate)}`,
			`  - 소득세: ${formatCurrency(result.totalRefundIncomeTax)}`,
			`  - 지방소득세: ${formatCurrency(result.totalRefundLocalTax)}`,
			"",
			"연도별 내역:",
		);
		result.yearlyDetails.forEach((y) => {
			lines.push(`  ${y.year}년: ${formatCurrency(y.refundIncomeTax ?? 0)}`);
		});
		lines.push(
			"",
			`수수료 예상: ${formatCurrency(result.feeEstimate.taxAgentFee)}`,
			`실수령 예상: ${formatCurrency(result.feeEstimate.customerNet)}`,
		);
	}

	lines.push("", "* 본 결과는 참고용이며 법적 효력이 없습니다.");
	return lines.join("\n");
};

export const formatTrack2ShareText = (result: SixWayResult): string => {
	const lines: string[] = ["[FINZ] 6Way 세금 비교 시뮬레이션 결과", ""];

	const optPre = result.scenarios.find((s) => s.scenario_no === result.optimal_pre);
	const optPost = result.scenarios.find((s) => s.scenario_no === result.optimal_post);

	if (optPre) lines.push(`비중과 최적: ${optPre.label} (${formatKorean(optPre.pre_total)})`);
	if (optPost) lines.push(`중과 최적: ${optPost.label} (${formatKorean(optPost.post_total)})`);

	lines.push("", "시나리오별 비교:");
	result.scenarios.forEach((s) => {
		lines.push(
			`  ${s.scenario_no}. ${s.label}: 비중과 ${formatKorean(s.pre_total)} / 중과 ${formatKorean(s.post_total)}`,
		);
	});

	lines.push(
		"",
		`리스크 델타: ${formatKorean(result.risk_delta)}`,
		"",
		"* 본 결과는 참고용이며 법적 효력이 없습니다.",
	);
	return lines.join("\n");
};

// ── PDF HTML 생성 ────────────────────────────

const HTML_BASE_STYLE = `
	body { font-family: -apple-system, sans-serif; padding: 24px; color: #222; font-size: 13px; }
	h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; }
	h2 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 2px solid #0d9488; padding-bottom: 4px; }
	table { width: 100%; border-collapse: collapse; margin: 8px 0; }
	th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; font-size: 12px; }
	th { background: #f0fdfa; text-align: center; font-weight: 700; }
	.amount { font-weight: 700; }
	.highlight { color: #0d9488; font-weight: 800; }
	.disclaimer { margin-top: 24px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 11px; color: #92400e; }
	.meta { color: #888; font-size: 11px; margin-bottom: 16px; }
`;

export const generateTrack1PdfHtml = (result: YouthTaxResult): string => {
	const yearRows = result.yearlyDetails
		.map(
			(y) => `
		<tr>
			<td>${y.year}년</td>
			<td>${y.type ?? "-"}</td>
			<td class="amount">${formatCurrency(y.totalSalary ?? 0)}</td>
			<td class="amount">${formatCurrency(y.calculatedTax ?? 0)}</td>
			<td class="amount">${formatCurrency(y.determinedTax ?? 0)}</td>
			<td class="amount highlight">${formatCurrency(y.refundIncomeTax ?? 0)}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${HTML_BASE_STYLE}</style></head><body>
		<h1>청년 소득세 감면 시뮬레이션 결과</h1>
		<p class="meta">생성일: ${result.calculatedAt} | FINZ</p>

		<h2>대상 판정</h2>
		<p>판정: <strong>${result.eligibility.isEligible ? "감면 대상" : "비대상"}</strong></p>
		<p>유형: ${result.eligibility.employmentType === "YOUTH" ? "청년" : "고령자"} | 세법상 나이: ${result.eligibility.taxAge}세</p>

		<h2>환급 요약</h2>
		<table>
			<tr><th>항목</th><th>금액</th></tr>
			<tr><td>소득세 환급</td><td class="amount highlight">${formatCurrency(result.totalRefundIncomeTax)}</td></tr>
			<tr><td>지방소득세 환급</td><td class="amount">${formatCurrency(result.totalRefundLocalTax)}</td></tr>
			<tr><td><strong>총 예상 환급액</strong></td><td class="amount highlight">${formatCurrency(result.totalRefundEstimate)}</td></tr>
		</table>

		<h2>수수료 예상</h2>
		<table>
			<tr><th>항목</th><th>금액</th></tr>
			<tr><td>세무사 수수료</td><td class="amount">${formatCurrency(result.feeEstimate.taxAgentFee)}</td></tr>
			<tr><td><strong>실수령 예상</strong></td><td class="amount highlight">${formatCurrency(result.feeEstimate.customerNet)}</td></tr>
		</table>

		<h2>연도별 상세 내역</h2>
		<table>
			<tr><th>연도</th><th>유형</th><th>총급여</th><th>산출세액</th><th>결정세액</th><th>환급액</th></tr>
			${yearRows}
		</table>

		<div class="disclaimer">
			본 시뮬레이션 결과는 입력된 정보를 기반으로 한 추정치이며, 실제 세무 신고 결과와 다를 수 있습니다.
			정확한 세무 상담은 세무사에게 문의하시기 바랍니다.
		</div>
	</body></html>`;
};

export const generateTrack2PdfHtml = (result: SixWayResult): string => {
	const scenarioRows = result.scenarios
		.map(
			(s) => `
		<tr>
			<td>${s.scenario_no}</td>
			<td style="text-align:left">${s.label}</td>
			<td class="amount">${formatKorean(s.pre_capital_gains_tax)}</td>
			<td class="amount">${formatKorean(s.pre_gift_tax)}</td>
			<td class="amount">${formatKorean(s.pre_acquisition_tax)}</td>
			<td class="amount highlight">${formatKorean(s.pre_total)}</td>
			<td class="amount">${formatKorean(s.post_total)}</td>
			<td class="amount">${formatKorean(s.surcharge_increase)}</td>
		</tr>`,
		)
		.join("");

	const optPre = result.scenarios.find((s) => s.scenario_no === result.optimal_pre);
	const optPost = result.scenarios.find((s) => s.scenario_no === result.optimal_post);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${HTML_BASE_STYLE}
		.optimal { background: #f0fdfa; padding: 12px; border-radius: 8px; margin: 8px 0; }
		.optimal strong { color: #0d9488; }
	</style></head><body>
		<h1>6Way 세금 비교 시뮬레이션 결과</h1>
		<p class="meta">생성일: ${result.calculated_at} | FINZ</p>

		<h2>최적 시나리오</h2>
		<div class="optimal">
			${optPre ? `<p>비중과 최적: <strong>${optPre.label}</strong> (${formatKorean(optPre.pre_total)})</p>` : ""}
			${optPost ? `<p>중과 적용 최적: <strong>${optPost.label}</strong> (${formatKorean(optPost.post_total)})</p>` : ""}
			<p>리스크 델타: <strong>${formatKorean(result.risk_delta)}</strong></p>
		</div>

		<h2>6Way 비교표</h2>
		<table>
			<tr>
				<th>No</th><th>시나리오</th>
				<th>양도세</th><th>증여세</th><th>취득세</th>
				<th>비중과 합계</th><th>중과 합계</th><th>중과 증가분</th>
			</tr>
			${scenarioRows}
		</table>

		<h2>순위</h2>
		<table>
			<tr><th>순위</th><th>비중과</th><th>중과</th></tr>
			${result.rank_pre
				.map((no, i) => {
					const postNo = result.rank_post[i];
					const pre = result.scenarios.find((s) => s.scenario_no === no);
					const post = result.scenarios.find((s) => s.scenario_no === postNo);
					return `<tr><td>${i + 1}위</td><td>${pre?.label ?? "-"}</td><td>${post?.label ?? "-"}</td></tr>`;
				})
				.join("")}
		</table>

		<div class="disclaimer">
			본 시뮬레이션 결과는 입력된 정보를 기반으로 한 추정치이며, 실제 세무 신고 결과와 다를 수 있습니다.
			정확한 세무 상담은 세무사에게 문의하시기 바랍니다.
			다주택자 중과 유예 만료일: 2026.05.09
		</div>
	</body></html>`;
};
