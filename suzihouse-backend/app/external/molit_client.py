"""
MOLIT (국토교통부) Real Trade API client.

Calls the actual public data API:
  https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev

Based on ex.js implementation — supports pagination, multi-month fetch,
and keyword filtering for apartment name/address search.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import Any

import httpx

from app.config import settings

_DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)
NUM_OF_ROWS = 1000

logger = logging.getLogger(__name__)

__all__ = ["MolitClient", "molit_client"]


def _val(v: Any) -> str:
    """Safely extract a trimmed string value."""
    if v is None:
        return ""
    s = str(v).strip()
    return s


def _parse_amount_to_won(raw: Any) -> int:
    """Convert API 거래금액 (만원 단위, comma-separated) to 원."""
    if not raw:
        return 0
    s = str(raw).replace(",", "").strip()
    try:
        return int(s) * 10_000  # 만원 → 원
    except (ValueError, TypeError):
        return 0


def _format_amount_display(raw: Any) -> str:
    """Format 거래금액 for display (e.g., '28억 5,000만원')."""
    if not raw:
        return "-"
    s = str(raw).replace(",", "").strip()
    try:
        num = int(s)
    except (ValueError, TypeError):
        return str(raw)
    if num >= 10000:
        eok = num // 10000
        rest = num % 10000
        if rest > 0:
            return f"{eok}억 {rest:,}만원"
        return f"{eok}억"
    return f"{num:,}만원"


class MolitClient:
    """Async client for the MOLIT real estate transaction API."""

    BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

    def __init__(self) -> None:
        self._api_key: str = settings.MOLIT_API_KEY
        self._timeout: httpx.Timeout = _DEFAULT_TIMEOUT

    def _parse_response(self, data: dict) -> dict[str, Any]:
        """Parse JSON response from the API."""
        header = data.get("response", {}).get("header", {})
        if not header or header.get("resultCode") != "000":
            code = header.get("resultCode", "?")
            msg = header.get("resultMsg", "알 수 없는 오류")
            return {"error": f"API 에러 [{code}]: {msg}"}

        body = data.get("response", {}).get("body", {})
        total_count = int(body.get("totalCount", 0))
        if total_count == 0:
            return {"items": [], "totalCount": 0}

        items = body.get("items", {}).get("item")
        if not items:
            return {"items": [], "totalCount": 0}

        item_list = items if isinstance(items, list) else [items]
        return {"items": item_list, "totalCount": total_count}

    @staticmethod
    def _parse_xml_response(xml_text: str) -> dict[str, Any]:
        """Parse XML response from the 공공데이터포털 API.

        The API returns XML by default. Structure:
        <response>
          <header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
          <body>
            <items><item>...</item><item>...</item></items>
            <totalCount>123</totalCount>
          </body>
        </response>
        """
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            return {"error": f"XML 파싱 오류: {e}"}

        # Header check
        header = root.find("header")
        if header is None:
            return {"error": "응답에 header가 없습니다"}

        result_code = header.findtext("resultCode", "?")
        if result_code != "000":
            result_msg = header.findtext("resultMsg", "알 수 없는 오류")
            return {"error": f"API 에러 [{result_code}]: {result_msg}"}

        # Body
        body = root.find("body")
        if body is None:
            return {"items": [], "totalCount": 0}

        total_count = int(body.findtext("totalCount", "0"))
        if total_count == 0:
            return {"items": [], "totalCount": 0}

        items_el = body.find("items")
        if items_el is None:
            return {"items": [], "totalCount": 0}

        items = []
        for item_el in items_el.findall("item"):
            item_dict = {}
            for child in item_el:
                item_dict[child.tag] = child.text
            items.append(item_dict)

        return {"items": items, "totalCount": total_count}

    async def _fetch_trades_for_month(
        self,
        lawd_cd: str,
        deal_ymd: str,
    ) -> list[dict[str, Any]]:
        """Fetch all transactions for a single month with pagination."""
        all_items: list[dict] = []
        page_no = 1
        total_count = float("inf")

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            while len(all_items) < total_count:
                # 공공데이터포털 serviceKey는 URL 인코딩하면 안 됨
                # httpx params는 자동 인코딩하므로 URL을 직접 조립
                url = (
                    f"{self.BASE_URL}"
                    f"?serviceKey={self._api_key}"
                    f"&LAWD_CD={lawd_cd}"
                    f"&DEAL_YMD={deal_ymd}"
                    f"&pageNo={page_no}"
                    f"&numOfRows={NUM_OF_ROWS}"
                )

                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPStatusError as e:
                    logger.error("MOLIT API HTTP error: %s", e.response.status_code)
                    break
                except httpx.RequestError as e:
                    logger.error("MOLIT API network error: %s", e)
                    break

                # 1차: JSON 파싱 시도
                result = None
                try:
                    data = resp.json()
                    result = self._parse_response(data)
                except Exception:
                    pass

                # 2차: XML 파싱 (공공데이터포털 기본 응답 형식)
                if result is None:
                    result = self._parse_xml_response(resp.text)

                if result.get("error"):
                    logger.error("MOLIT API: %s", result["error"])
                    break

                total_count = result.get("totalCount", 0)
                items = result.get("items", [])
                if total_count == 0 or len(items) == 0:
                    break

                all_items.extend(items)
                page_no += 1

        return all_items

    async def fetch_trades_multi_month(
        self,
        lawd_cd: str,
        months: list[str],
    ) -> list[dict[str, Any]]:
        """Fetch transactions for multiple months sequentially."""
        all_items: list[dict] = []

        for ym in months:
            logger.info("MOLIT fetching: lawd_cd=%s, month=%s", lawd_cd, ym)
            items = await self._fetch_trades_for_month(lawd_cd, ym)
            logger.info("MOLIT fetched %d items for %s", len(items), ym)
            all_items.extend(items)

        return all_items

    def _normalize_item(self, item: dict, idx: int) -> dict[str, Any]:
        """Normalize a raw API item into our standard format."""
        apt_name = _val(item.get("aptNm"))
        umd_nm = _val(item.get("umdNm"))
        jibun = _val(item.get("jibun"))
        road_nm_base = _val(item.get("roadNm"))
        road_nm_bonbun = _val(item.get("roadNmBonbun"))
        road_nm_bubun = _val(item.get("roadNmBubun"))
        # 도로명 + 건물번호 결합 (예: "올림픽로35길 11-2")
        road_nm = road_nm_base
        if road_nm_bonbun and road_nm_bonbun != "0":
            bldg_no = road_nm_bonbun
            if road_nm_bubun and road_nm_bubun != "0":
                bldg_no += f"-{road_nm_bubun}"
            road_nm = f"{road_nm_base} {bldg_no}" if road_nm_base else bldg_no
        build_year = _val(item.get("buildYear"))
        floor_str = _val(item.get("floor"))
        area_str = _val(item.get("excluUseAr"))
        deal_amount_raw = _val(item.get("dealAmount"))
        deal_year = _val(item.get("dealYear"))
        deal_month = str(_val(item.get("dealMonth"))).zfill(2)
        deal_day = str(_val(item.get("dealDay"))).zfill(2)
        cancel_type = _val(item.get("cdealType"))
        dealing_gbn = _val(item.get("dealingGbn"))
        apt_seq = _val(item.get("aptSeq"))
        sgg_cd = _val(item.get("sggCd"))
        umd_cd = _val(item.get("umdCd"))
        apt_dong = _val(item.get("aptDong"))

        try:
            area = float(area_str) if area_str else 0.0
        except (ValueError, TypeError):
            area = 0.0

        try:
            floor_num = int(floor_str) if floor_str else 0
        except (ValueError, TypeError):
            floor_num = 0

        deal_amount_won = _parse_amount_to_won(deal_amount_raw)
        deal_amount_display = _format_amount_display(deal_amount_raw)
        deal_date = f"{deal_year}-{deal_month}-{deal_day}"

        # Compute area in 평
        area_pyeong = round(area / 3.3058, 1) if area > 0 else 0.0

        trade_id = f"trade_{sgg_cd}_{deal_year}{deal_month}{deal_day}_{apt_seq}_{idx}"

        return {
            "trade_id": trade_id,
            "apt_name": apt_name,
            "area": round(area, 2),
            "area_pyeong": area_pyeong,
            "deal_amount": deal_amount_won,
            "deal_amount_display": deal_amount_display,
            "floor": floor_num,
            "deal_date": deal_date,
            "umd_nm": umd_nm,
            "jibun": jibun,
            "road_nm": road_nm,
            "build_year": build_year,
            "is_canceled": bool(cancel_type),
            "dealing_type": dealing_gbn,
            "apt_dong": apt_dong,
            "apt_seq": apt_seq,
        }

    def filter_by_keyword(
        self,
        items: list[dict[str, Any]],
        keyword: str,
    ) -> list[dict[str, Any]]:
        """Filter raw API items by keyword (apt name, address)."""
        if not keyword:
            return items
        kw = keyword.strip().lower()
        return [
            item for item in items
            if kw in _val(item.get("aptNm")).lower()
            or kw in _val(item.get("umdNm")).lower()
            or kw in _val(item.get("jibun")).lower()
            or kw in _val(item.get("roadNm")).lower()
        ]

    async def search_apartments(
        self,
        lawd_cd: str,
        keyword: str = "",
        end_ym: str | None = None,
    ) -> dict[str, Any]:
        """Search apartments with 6-month range, filter by keyword.

        Parameters
        ----------
        lawd_cd : str
            5-digit legal area code.
        keyword : str
            Optional apartment name or address keyword.
        end_ym : str, optional
            End month in YYYYMM format. Defaults to current month.

        Returns
        -------
        dict with keys:
            - apartments: list of grouped apartment data
            - total_trades: total raw trade count
            - filtered_trades: filtered trade count
            - period: search period string
        """
        from datetime import datetime as dt

        if not end_ym:
            now = dt.now()
            end_ym = f"{now.year}{now.month:02d}"

        months = self._get_month_range(end_ym)
        period = f"{months[0][:4]}.{months[0][4:]}~{months[-1][:4]}.{months[-1][4:]}"

        # Fetch all trades for 6 months
        raw_items = await self.fetch_trades_multi_month(lawd_cd, months)
        total_trades = len(raw_items)

        # Filter by keyword
        filtered_items = self.filter_by_keyword(raw_items, keyword)
        filtered_trades = len(filtered_items)

        # Normalize items
        normalized = [
            self._normalize_item(item, idx)
            for idx, item in enumerate(filtered_items)
        ]

        # Sort by date desc, then amount desc
        normalized.sort(key=lambda x: (x["deal_date"], x["deal_amount"]), reverse=True)

        # Group by apartment name
        apt_groups: dict[str, list[dict]] = {}
        for item in normalized:
            key = item["apt_name"]
            if key not in apt_groups:
                apt_groups[key] = []
            apt_groups[key].append(item)

        # Build apartment summary list
        apartments = []
        for apt_name, trades in apt_groups.items():
            # Collect unique areas
            areas = sorted(set(
                f"{t['area']}㎡({t['area_pyeong']}평)"
                for t in trades if t["area"] > 0
            ))

            # Price range
            amounts = [t["deal_amount"] for t in trades if t["deal_amount"] > 0]
            min_price = min(amounts) if amounts else 0
            max_price = max(amounts) if amounts else 0

            apartments.append({
                "apt_name": apt_name,
                "trade_count": len(trades),
                "areas": areas,
                "min_price": min_price,
                "max_price": max_price,
                "min_price_display": _format_amount_display(min_price // 10_000) if min_price else "-",
                "max_price_display": _format_amount_display(max_price // 10_000) if max_price else "-",
                "latest_trade_date": trades[0]["deal_date"] if trades else "",
                "build_year": trades[0].get("build_year", "") if trades else "",
                "umd_nm": trades[0].get("umd_nm", "") if trades else "",
                "road_nm": trades[0].get("road_nm", "") if trades else "",
                "trades": trades,
            })

        # Sort by trade count desc
        apartments.sort(key=lambda x: x["trade_count"], reverse=True)

        return {
            "apartments": apartments,
            "total_trades": total_trades,
            "filtered_trades": filtered_trades,
            "period": period,
        }

    @staticmethod
    def _get_month_range(end_ym: str) -> list[str]:
        """Generate 6-month range ending at end_ym (inclusive)."""
        months = []
        year = int(end_ym[:4])
        month = int(end_ym[4:6])

        for _ in range(6):
            months.append(f"{year}{month:02d}")
            month -= 1
            if month < 1:
                month = 12
                year -= 1

        return list(reversed(months))

    # ── Legacy interface (kept for backward compatibility) ────────────────

    async def search_real_trade(
        self,
        lawd_cd: str,
        deal_ymd: str,
    ) -> list[dict[str, Any]]:
        """Search real estate transactions for a single month.

        Parameters
        ----------
        lawd_cd : str
            Legal administrative district code (5 digits).
        deal_ymd : str
            Deal period in YYYYMM format.

        Returns
        -------
        list[dict]
            Normalized transaction records.
        """
        logger.info(
            "MOLIT search_real_trade: lawd_cd=%s, deal_ymd=%s",
            lawd_cd,
            deal_ymd,
        )

        raw_items = await self._fetch_trades_for_month(lawd_cd, deal_ymd)
        return [
            self._normalize_item(item, idx)
            for idx, item in enumerate(raw_items)
        ]


# ── Module-level singleton ──────────────────────────────────────────────────
molit_client = MolitClient()
