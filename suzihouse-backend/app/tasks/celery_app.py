"""
Shared Celery application instance.

All task modules (track1_tasks, track2_tasks, etc.) import ``celery_app``
from here so there is exactly one Celery application per worker process.
"""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "suzihouse",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # ── Celery Beat 스케줄 ──────────────────────────────────────────────
    beat_schedule={
        # 매주 월요일 06:00 (KST) — 모든 조정대상지역 실거래가 동기화
        "realtrade-sync-weekly": {
            "task": "realtrade.sync_all_regions",
            "schedule": crontab(hour=6, minute=0, day_of_week="monday"),
            "kwargs": {"force": True},
        },
    },
)

# Auto-discover tasks in all task modules
celery_app.autodiscover_tasks(["app.tasks"])
