"""
Realtrade cache service — DB 기반 실거래가 캐시 관리.

핵심 흐름:
1. sync_region_month()  : MOLIT API → DB 저장 (Celery task에서 호출)
2. search_apartments()  : DB에서 SQL 검색 (사용자 요청)
3. get_sync_status()    : 동기화 상태 확인
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.external.molit_client import molit_client
from app.external.regions import ALL_REGIONS
from app.models.realtrade import RealtradeSyncLog, RealtradeTrade

logger = logging.getLogger(__name__)

# 캐시 유효기간: 동일 지역/월 데이터는 이 시간 이내면 재수집하지 않음
# 주 1회 스케줄 동기화 + 온디맨드 동기화 (캐시 miss 시)
CACHE_TTL_HOURS = 24 * 7      # 현재 월: 7일 (주 1회 Beat가 갱신)
CACHE_TTL_HOURS_PAST = 24 * 30  # 과거 월: 30일 (거의 변하지 않음)


def _val(v: Any) -> str:
    """Safely extract trimmed string."""
    if v is None:
        return ""
    return str(v).strip()


def _int_val(v: Any) -> int:
    """Safely parse int."""
    try:
        return int(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0


def _float_val(v: Any) -> float:
    """Safely parse float."""
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return 0.0


def _build_road_nm(item: dict) -> str:
    """도로명 + 건물번호 결합 (예: '올림픽로35길 11-2')."""
    base = _val(item.get("roadNm"))
    bonbun = _val(item.get("roadNmBonbun"))
    bubun = _val(item.get("roadNmBubun"))
    if bonbun and bonbun != "0":
        bldg_no = bonbun
        if bubun and bubun != "0":
            bldg_no += f"-{bubun}"
        return f"{base} {bldg_no}" if base else bldg_no
    return base


def _get_month_range(end_ym: str, count: int = 6) -> list[str]:
    """Generate month range ending at end_ym (inclusive)."""
    months = []
    year = int(end_ym[:4])
    month = int(end_ym[4:6])
    for _ in range(count):
        months.append(f"{year}{month:02d}")
        month -= 1
        if month < 1:
            month = 12
            year -= 1
    return list(reversed(months))


def _current_ym() -> str:
    now = datetime.now()
    return f"{now.year}{now.month:02d}"


def _format_amount_display(amount_man_won: int) -> str:
    """만원 단위 → '28억 5,000만원' 형식."""
    if amount_man_won <= 0:
        return "-"
    if amount_man_won >= 10000:
        eok = amount_man_won // 10000
        rest = amount_man_won % 10000
        if rest > 0:
            return f"{eok}억 {rest:,}만원"
        return f"{eok}억"
    return f"{amount_man_won:,}만원"


# ═══════════════════════════════════════════════════════════════════════════
# 1. 동기화 (MOLIT API → DB)
# ═══════════════════════════════════════════════════════════════════════════


async def sync_region_month(
    db: AsyncSession,
    lawd_cd: str,
    deal_ymd: str,
    force: bool = False,
) -> dict[str, Any]:
    """특정 지역/월의 거래 데이터를 MOLIT API에서 가져와 DB에 저장.

    Parameters
    ----------
    db : AsyncSession
    lawd_cd : 법정동코드 5자리
    deal_ymd : YYYYMM
    force : True면 캐시 유효기간 무시하고 강제 재수집

    Returns
    -------
    dict with status, count, message
    """
    # 캐시 유효성 체크
    if not force:
        is_current = deal_ymd == _current_ym()
        ttl = CACHE_TTL_HOURS if is_current else CACHE_TTL_HOURS_PAST
        cutoff = datetime.now() - timedelta(hours=ttl)

        result = await db.execute(
            select(RealtradeSyncLog).where(
                RealtradeSyncLog.lawd_cd == lawd_cd,
                RealtradeSyncLog.deal_ymd == deal_ymd,
                RealtradeSyncLog.status == "SUCCESS",
                RealtradeSyncLog.synced_at >= cutoff,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.info(
                "Cache hit: lawd_cd=%s, deal_ymd=%s (synced_at=%s)",
                lawd_cd, deal_ymd, existing.synced_at,
            )
            return {
                "status": "CACHED",
                "count": existing.total_count,
                "message": f"캐시 유효 (마지막 동기화: {existing.synced_at})",
            }

    logger.info("Syncing from MOLIT API: lawd_cd=%s, deal_ymd=%s", lawd_cd, deal_ymd)

    # MOLIT API 호출
    try:
        raw_items = await molit_client._fetch_trades_for_month(lawd_cd, deal_ymd)
    except Exception as e:
        logger.error("MOLIT API call failed: %s", e)
        await _upsert_sync_log(db, lawd_cd, deal_ymd, "FAILED", 0, str(e))
        return {"status": "FAILED", "count": 0, "message": str(e)}

    if not raw_items:
        await _upsert_sync_log(db, lawd_cd, deal_ymd, "SUCCESS", 0)
        return {"status": "SUCCESS", "count": 0, "message": "데이터 없음"}

    # 기존 데이터 삭제 후 새로 삽입 (upsert보다 안정적)
    await db.execute(
        delete(RealtradeTrade).where(
            RealtradeTrade.lawd_cd == lawd_cd,
            RealtradeTrade.deal_ymd == deal_ymd,
        )
    )

    # Bulk insert
    trade_rows = []
    for item in raw_items:
        deal_month_str = str(_val(item.get("dealMonth"))).zfill(2)
        deal_day_str = str(_val(item.get("dealDay"))).zfill(2)

        trade_rows.append(
            RealtradeTrade(
                lawd_cd=lawd_cd,
                sgg_cd=_val(item.get("sggCd")),
                umd_cd=_val(item.get("umdCd")),
                umd_nm=_val(item.get("umdNm")),
                jibun=_val(item.get("jibun")),
                road_nm=_build_road_nm(item),
                apt_nm=_val(item.get("aptNm")),
                apt_seq=_val(item.get("aptSeq")),
                apt_dong=_val(item.get("aptDong")),
                build_year=_val(item.get("buildYear")),
                deal_year=_val(item.get("dealYear")),
                deal_month=deal_month_str,
                deal_day=deal_day_str,
                deal_ymd=deal_ymd,
                deal_amount=_int_val(item.get("dealAmount")),
                exclu_use_ar=_float_val(item.get("excluUseAr")),
                floor=_int_val(item.get("floor")),
                cdeal_type=_val(item.get("cdealType")),
                cdeal_day=_val(item.get("cdealDay")),
                dealing_gbn=_val(item.get("dealingGbn")),
                sler_gbn=_val(item.get("slerGbn")),
                buyer_gbn=_val(item.get("buyerGbn")),
                land_lease_hold_gbn=_val(item.get("landLeaseholdGbn")),
                rgst_date=_val(item.get("rgstDate")),
                estate_agent_sgg_nm=_val(item.get("estateAgentSggNm")),
            )
        )

    db.add_all(trade_rows)
    await db.flush()

    # Sync log 업데이트
    await _upsert_sync_log(db, lawd_cd, deal_ymd, "SUCCESS", len(trade_rows))

    logger.info(
        "Synced %d trades: lawd_cd=%s, deal_ymd=%s",
        len(trade_rows), lawd_cd, deal_ymd,
    )
    return {
        "status": "SUCCESS",
        "count": len(trade_rows),
        "message": f"{len(trade_rows)}건 동기화 완료",
    }


async def sync_region_6months(
    db: AsyncSession,
    lawd_cd: str,
    end_ym: str | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """특정 지역의 최근 6개월 데이터를 동기화."""
    if not end_ym:
        end_ym = _current_ym()

    months = _get_month_range(end_ym)
    results = []
    total_synced = 0

    for ym in months:
        result = await sync_region_month(db, lawd_cd, ym, force=force)
        results.append(result)
        total_synced += result.get("count", 0)

    return {
        "lawd_cd": lawd_cd,
        "months": months,
        "total_synced": total_synced,
        "details": results,
    }


async def sync_all_regions(
    db: AsyncSession,
    end_ym: str | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """모든 조정대상지역 (37곳) × 6개월 동기화.

    Celery Beat 스케줄러에서 호출됩니다.
    """
    if not end_ym:
        end_ym = _current_ym()

    months = _get_month_range(end_ym)
    total_synced = 0
    region_count = 0
    errors = []

    for region in ALL_REGIONS:
        lawd_cd = region["code"]
        region_name = f"{region['sido']} {region['name']}"

        for ym in months:
            try:
                result = await sync_region_month(db, lawd_cd, ym, force=force)
                total_synced += result.get("count", 0)
            except Exception as e:
                logger.error("Sync error %s %s: %s", region_name, ym, e)
                errors.append(f"{region_name} {ym}: {e}")

        region_count += 1
        logger.info("Synced region %d/%d: %s", region_count, len(ALL_REGIONS), region_name)

    return {
        "regions_synced": region_count,
        "total_synced": total_synced,
        "errors": errors,
    }


async def _upsert_sync_log(
    db: AsyncSession,
    lawd_cd: str,
    deal_ymd: str,
    status: str,
    total_count: int,
    error_message: str | None = None,
) -> None:
    """Sync log upsert (INSERT or UPDATE)."""
    # Check existing
    result = await db.execute(
        select(RealtradeSyncLog).where(
            RealtradeSyncLog.lawd_cd == lawd_cd,
            RealtradeSyncLog.deal_ymd == deal_ymd,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.status = status
        existing.total_count = total_count
        existing.synced_at = datetime.now()
        existing.error_message = error_message
    else:
        db.add(RealtradeSyncLog(
            lawd_cd=lawd_cd,
            deal_ymd=deal_ymd,
            status=status,
            total_count=total_count,
            synced_at=datetime.now(),
            error_message=error_message,
        ))

    await db.flush()


# ═══════════════════════════════════════════════════════════════════════════
# 2. DB 검색 (사용자 요청 처리)
# ═══════════════════════════════════════════════════════════════════════════


async def search_apartments(
    db: AsyncSession,
    lawd_cd: str,
    keyword: str = "",
    end_ym: str | None = None,
) -> dict[str, Any]:
    """DB에서 아파트 실거래 데이터 검색.

    1. 캐시가 없거나 만료된 경우 → 자동으로 동기화 트리거
    2. DB에서 SQL 인덱스 검색
    3. 아파트별 그룹화하여 반환

    Parameters
    ----------
    db : AsyncSession
    lawd_cd : 법정동코드
    keyword : 아파트명/주소 키워드 (빈 문자열이면 전체)
    end_ym : 기준년월 (기본: 현재월)
    """
    if not end_ym:
        end_ym = _current_ym()

    months = _get_month_range(end_ym)

    # 캐시 확인 및 필요시 동기화
    await _ensure_cache(db, lawd_cd, months)

    # DB 검색 쿼리
    query = select(RealtradeTrade).where(
        RealtradeTrade.lawd_cd == lawd_cd,
        RealtradeTrade.deal_ymd.in_(months),
    )

    # 키워드 필터 (SQL LIKE — 인덱스 활용)
    if keyword.strip():
        kw = f"%{keyword.strip()}%"
        query = query.where(
            RealtradeTrade.apt_nm.ilike(kw)
            | RealtradeTrade.umd_nm.ilike(kw)
            | RealtradeTrade.jibun.ilike(kw)
            | RealtradeTrade.road_nm.ilike(kw)
        )

    # 정렬: 거래일 내림차순, 금액 내림차순
    query = query.order_by(
        RealtradeTrade.deal_year.desc(),
        RealtradeTrade.deal_month.desc(),
        RealtradeTrade.deal_day.desc(),
        RealtradeTrade.deal_amount.desc(),
    )

    result = await db.execute(query)
    trades = result.scalars().all()

    # 전체 거래 건수 (키워드 필터 전)
    total_query = select(func.count(RealtradeTrade.id)).where(
        RealtradeTrade.lawd_cd == lawd_cd,
        RealtradeTrade.deal_ymd.in_(months),
    )
    total_result = await db.execute(total_query)
    total_trades = total_result.scalar() or 0

    # 아파트별 그룹화
    period = f"{months[0][:4]}.{months[0][4:]}~{months[-1][:4]}.{months[-1][4:]}"
    apartments = _group_by_apartment(trades)

    return {
        "apartments": apartments,
        "total_trades": total_trades,
        "filtered_trades": len(trades),
        "period": period,
    }


async def _ensure_cache(
    db: AsyncSession,
    lawd_cd: str,
    months: list[str],
) -> None:
    """필요한 월의 캐시가 없으면 동기화."""
    current_ym = _current_ym()

    for ym in months:
        is_current = ym == current_ym
        ttl = CACHE_TTL_HOURS if is_current else CACHE_TTL_HOURS_PAST
        cutoff = datetime.now() - timedelta(hours=ttl)

        result = await db.execute(
            select(RealtradeSyncLog).where(
                RealtradeSyncLog.lawd_cd == lawd_cd,
                RealtradeSyncLog.deal_ymd == ym,
                RealtradeSyncLog.status == "SUCCESS",
                RealtradeSyncLog.synced_at >= cutoff,
            )
        )
        if result.scalar_one_or_none() is None:
            # 캐시 없음 또는 만료 → 동기화
            logger.info("Cache miss, syncing: lawd_cd=%s, deal_ymd=%s", lawd_cd, ym)
            await sync_region_month(db, lawd_cd, ym)


def _group_by_apartment(trades: list[RealtradeTrade]) -> list[dict[str, Any]]:
    """거래 레코드를 아파트 단지별로 그룹화."""
    groups: dict[str, dict[str, Any]] = {}

    for t in trades:
        key = t.apt_nm
        if key not in groups:
            groups[key] = {
                "apt_name": t.apt_nm,
                "umd_nm": t.umd_nm,
                "road_nm": t.road_nm,
                "build_year": t.build_year,
                "trades": [],
                "_areas": set(),
                "_amounts": [],
            }

        area_pyeong = round(t.exclu_use_ar / 3.3058, 1) if t.exclu_use_ar > 0 else 0.0
        deal_date = f"{t.deal_year}-{t.deal_month}-{t.deal_day}"

        groups[key]["trades"].append({
            "trade_id": f"cache_{t.id}",
            "area": round(t.exclu_use_ar, 2),
            "area_pyeong": area_pyeong,
            "deal_amount": t.deal_amount * 10_000,  # 만원 → 원
            "deal_amount_display": _format_amount_display(t.deal_amount),
            "floor": t.floor,
            "deal_date": deal_date,
            "is_canceled": bool(t.cdeal_type),
            "dealing_type": t.dealing_gbn,
            "apt_dong": t.apt_dong,
        })

        if t.exclu_use_ar > 0:
            groups[key]["_areas"].add(
                f"{t.exclu_use_ar:.2f}㎡({area_pyeong}평)"
            )
        if t.deal_amount > 0:
            groups[key]["_amounts"].append(t.deal_amount)

    # Build final list
    apartments = []
    for data in groups.values():
        amounts = data.pop("_amounts")
        areas = sorted(data.pop("_areas"))
        min_amt = min(amounts) if amounts else 0
        max_amt = max(amounts) if amounts else 0

        data["trade_count"] = len(data["trades"])
        data["areas"] = areas
        data["min_price"] = min_amt * 10_000
        data["max_price"] = max_amt * 10_000
        data["min_price_display"] = _format_amount_display(min_amt)
        data["max_price_display"] = _format_amount_display(max_amt)
        data["latest_trade_date"] = data["trades"][0]["deal_date"] if data["trades"] else ""

        apartments.append(data)

    # 거래 건수 내림차순 정렬
    apartments.sort(key=lambda x: x["trade_count"], reverse=True)
    return apartments


# ═══════════════════════════════════════════════════════════════════════════
# 3. 동기화 상태 조회
# ═══════════════════════════════════════════════════════════════════════════


async def get_sync_status(
    db: AsyncSession,
    lawd_cd: str | None = None,
) -> list[dict[str, Any]]:
    """동기화 상태 조회 (관리자용)."""
    query = select(RealtradeSyncLog).order_by(
        RealtradeSyncLog.lawd_cd,
        RealtradeSyncLog.deal_ymd.desc(),
    )
    if lawd_cd:
        query = query.where(RealtradeSyncLog.lawd_cd == lawd_cd)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "lawd_cd": log.lawd_cd,
            "deal_ymd": log.deal_ymd,
            "status": log.status,
            "total_count": log.total_count,
            "synced_at": log.synced_at.isoformat() if log.synced_at else None,
            "error_message": log.error_message,
        }
        for log in logs
    ]
