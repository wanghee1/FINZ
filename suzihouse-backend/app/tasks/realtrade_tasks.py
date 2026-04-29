"""
Celery tasks for realtrade cache synchronization.

Tasks:
- sync_region_task       : 특정 지역 6개월 동기화
- sync_all_regions_task  : 모든 조정대상지역 동기화 (스케줄)
"""

from __future__ import annotations

import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Celery worker에서 async 코루틴 실행."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    name="realtrade.sync_region",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_region_task(self, lawd_cd: str, end_ym: str | None = None, force: bool = False):
    """특정 지역의 최근 6개월 실거래가 데이터를 동기화."""
    logger.info("sync_region_task: lawd_cd=%s, end_ym=%s", lawd_cd, end_ym)

    async def _do():
        from app.core.database import AsyncSessionLocal
        from app.services import realtrade_cache_service

        async with AsyncSessionLocal() as db:
            try:
                result = await realtrade_cache_service.sync_region_6months(
                    db, lawd_cd, end_ym, force=force
                )
                await db.commit()
                return result
            except Exception:
                await db.rollback()
                raise

    try:
        return _run_async(_do())
    except Exception as exc:
        logger.error("sync_region_task failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="realtrade.sync_all_regions",
    bind=True,
    max_retries=1,
    default_retry_delay=300,
)
def sync_all_regions_task(self, end_ym: str | None = None, force: bool = False):
    """모든 조정대상지역 (37곳) 실거래가 동기화.

    Celery Beat 스케줄러에서 주기적으로 호출됩니다.
    """
    logger.info("sync_all_regions_task started: end_ym=%s, force=%s", end_ym, force)

    async def _do():
        from app.core.database import AsyncSessionLocal
        from app.services import realtrade_cache_service

        async with AsyncSessionLocal() as db:
            try:
                result = await realtrade_cache_service.sync_all_regions(
                    db, end_ym, force=force
                )
                await db.commit()
                return result
            except Exception:
                await db.rollback()
                raise

    try:
        result = _run_async(_do())
        logger.info(
            "sync_all_regions_task done: %d regions, %d trades",
            result.get("regions_synced", 0),
            result.get("total_synced", 0),
        )
        return result
    except Exception as exc:
        logger.error("sync_all_regions_task failed: %s", exc)
        raise self.retry(exc=exc)
