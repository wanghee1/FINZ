"""
OpenAI GPT client for generating AI summaries of Track 2 simulation results.

Provides a stub interface that generates template-based Korean-language
summaries of the 6-way property transfer comparison.

In production, this will call the OpenAI Chat Completions API.

IMPORTANT -- Legal compliance (세무사법 준수):
  - NEVER use advisory language such as "유리합니다", "추천합니다", "해야 합니다"
  - Use only factual comparison expressions:
    - "~세금이 더 적습니다" (tax is lower)
    - "~합계가 가장 낮습니다" (total is the lowest)
  - No investment / legal advice; factual comparison only
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

__all__ = ["OpenAIClient", "openai_client"]


def _format_krw(amount: int) -> str:
    """Format a Korean won amount in a human-readable way.

    Examples:
        1_234_567_890 -> "약 12억 3,457만원"
        56_000_000    -> "약 5,600만원"
    """
    eok = amount // 100_000_000
    remainder = amount % 100_000_000
    man = remainder // 10_000

    if eok > 0 and man > 0:
        return f"약 {eok}억 {man:,}만원"
    elif eok > 0:
        return f"약 {eok}억원"
    elif man > 0:
        return f"약 {man:,}만원"
    else:
        return f"{amount:,}원"


class OpenAIClient:
    """Async client for generating tax summary text via OpenAI GPT."""

    def __init__(self) -> None:
        self._api_key: str = settings.OPENAI_API_KEY
        self._model: str = settings.OPENAI_MODEL

    async def generate_tax_summary(
        self,
        six_way_result: dict[str, Any],
        tone: str = "SHORT",
        focus: list[int] | None = None,
    ) -> str:
        """Generate an AI summary of the 6-way comparison result.

        Parameters
        ----------
        six_way_result : dict
            The full Track2ResultResponse-like dictionary containing:
            - ``scenarios`` : list of scenario dicts
            - ``rank_pre``  : pre-policy ranking
            - ``rank_post`` : post-policy ranking
            - ``optimal_pre`` : best pre-policy scenario number
            - ``optimal_post`` : best post-policy scenario number
            - ``risk_delta``  : risk delta value
        tone : str
            Summary style. One of ``"SHORT"``, ``"DETAILED"``, ``"FRIENDLY"``.
        focus : list[int] | None
            If provided, limit discussion to these scenario numbers.

        Returns
        -------
        str
            Korean-language factual comparison text.

        Notes
        -----
        This is currently a **stub implementation** that generates template-based
        text.  In production, replace with an actual OpenAI API call::

            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self._api_key)
            response = await client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )
            return response.choices[0].message.content
        """
        logger.info(
            "OpenAI generate_tax_summary called: tone=%s, focus=%s (stub)",
            tone,
            focus,
        )

        scenarios = six_way_result.get("scenarios", [])
        if not scenarios:
            return "시뮬레이션 결과 데이터가 없습니다."

        # ── Filter scenarios if focus is specified ───────────────────────────
        if focus:
            filtered = [s for s in scenarios if s.get("scenario_no") in focus]
            if filtered:
                scenarios = filtered

        # ── Find best pre-policy and best post-policy scenarios ──────────────
        optimal_pre_no = six_way_result.get("optimal_pre", 0)
        optimal_post_no = six_way_result.get("optimal_post", 0)

        best_pre = next(
            (s for s in scenarios if s.get("scenario_no") == optimal_pre_no),
            scenarios[0],
        )
        best_post = next(
            (s for s in scenarios if s.get("scenario_no") == optimal_post_no),
            scenarios[0],
        )

        # ── Find worst scenarios for comparison ──────────────────────────────
        worst_pre = max(scenarios, key=lambda s: s.get("pre_total", 0))
        worst_post = max(scenarios, key=lambda s: s.get("post_total", 0))

        risk_delta = six_way_result.get("risk_delta", 0)

        # ── Build factual summary text ───────────────────────────────────────
        lines: list[str] = []

        lines.append("[ 6가지 시나리오 세금 비교 요약 ]")
        lines.append("")

        # Pre-policy summary
        lines.append("■ 비중과(현행) 기준:")
        lines.append(
            f"  - {best_pre.get('label', '')} 시나리오의 세금 합계가 가장 낮습니다."
        )
        lines.append(
            f"    ({_format_krw(best_pre.get('pre_total', 0))})"
        )

        if best_pre.get("scenario_no") != worst_pre.get("scenario_no"):
            diff = worst_pre.get("pre_total", 0) - best_pre.get("pre_total", 0)
            lines.append(
                f"  - {worst_pre.get('label', '')} 시나리오 대비 "
                f"{_format_krw(diff)} 세금이 더 적습니다."
            )

        lines.append("")

        # Post-policy summary
        lines.append("■ 중과(개정) 기준:")
        lines.append(
            f"  - {best_post.get('label', '')} 시나리오의 세금 합계가 가장 낮습니다."
        )
        lines.append(
            f"    ({_format_krw(best_post.get('post_total', 0))})"
        )

        if best_post.get("scenario_no") != worst_post.get("scenario_no"):
            diff = worst_post.get("post_total", 0) - best_post.get("post_total", 0)
            lines.append(
                f"  - {worst_post.get('label', '')} 시나리오 대비 "
                f"{_format_krw(diff)} 세금이 더 적습니다."
            )

        lines.append("")

        # Pre vs post comparison
        if best_pre.get("scenario_no") != best_post.get("scenario_no"):
            lines.append("■ 비중과 vs 중과 비교:")
            lines.append(
                f"  - 비중과 기준에서는 {best_pre.get('label', '')}의 세금 합계가 가장 낮고,"
            )
            lines.append(
                f"    중과 기준에서는 {best_post.get('label', '')}의 세금 합계가 가장 낮습니다."
            )
            lines.append("")

        # Risk delta
        if risk_delta > 0:
            lines.append(
                f"■ 최대 위험 변동폭: {_format_krw(risk_delta)}"
            )
            lines.append(
                "  (가장 낮은 비중과 세금과 가장 높은 중과 세금 간의 차이입니다.)"
            )
            lines.append("")

        # DETAILED tone: add per-scenario breakdown
        if tone == "DETAILED":
            lines.append("■ 시나리오별 세금 합계:")
            for s in sorted(scenarios, key=lambda x: x.get("scenario_no", 0)):
                lines.append(
                    f"  {s.get('scenario_no', 0)}. {s.get('label', '')} "
                    f"| 비중과: {_format_krw(s.get('pre_total', 0))} "
                    f"| 중과: {_format_krw(s.get('post_total', 0))} "
                    f"| 중과 증가분: {_format_krw(s.get('surcharge_increase', 0))}"
                )
            lines.append("")

        # Disclaimer
        lines.append(
            "※ 본 요약은 입력된 조건에 기반한 세금 비교 정보이며, "
            "세무 상담이나 법적 조언이 아닙니다."
        )

        return "\n".join(lines)


# ── Module-level singleton ──────────────────────────────────────────────────
openai_client = OpenAIClient()
