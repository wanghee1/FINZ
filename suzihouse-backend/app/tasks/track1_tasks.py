"""
Celery tasks for Track 1 – asynchronous data collection and calculation.

The Celery application is configured to work **optionally**: the main
FastAPI application functions correctly without a running broker by
performing the same work synchronously inside the service layer.

When a Celery worker *is* available the service layer can dispatch to
``collect_and_calculate_task.delay(...)`` instead of calling
``_process_tax_data`` directly.

Usage (worker)::

    celery -A app.tasks.track1_tasks worker --loglevel=info
"""

from __future__ import annotations

import logging

from celery import Celery

logger = logging.getLogger(__name__)

# ── Celery application ───────────────────────────────────────────────────────
celery_app = Celery("suzihouse")

try:
    from app.config import settings

    celery_app.conf.update(
        broker_url=settings.CELERY_BROKER_URL,
        result_backend=settings.CELERY_RESULT_BACKEND,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="Asia/Seoul",
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
    )
except Exception:
    # Settings may not be loadable in all environments (e.g. tests without
    # a .env file).  Fall back to defaults – the tasks are stubs anyway.
    logger.warning(
        "Could not load app.config.settings for Celery configuration; "
        "using defaults."
    )


@celery_app.task(
    bind=True,
    name="track1.collect_and_calculate",
    max_retries=3,
    default_retry_delay=10,
)
def collect_and_calculate_task(
    self,  # noqa: ANN001 – Celery task instance
    collect_job_id: str,
    user_id: int,
) -> dict:
    """Asynchronously collect tax data and run the refund calculation.

    This is a **stub**.  In the current implementation the same work is
    performed synchronously inside ``track1_service.request_tax_data``.

    When fully wired up, this task would:

    1. Open a new async DB session.
    2. Call ``track1_service._process_tax_data(db, collect_job_id, user_id)``.
    3. Commit or roll back.
    4. Return a summary dict ``{"status": "DONE", ...}``.

    Retries up to 3 times on transient failures (network errors, DB
    lock timeouts, etc.).

    Parameters
    ----------
    collect_job_id : str
        The ``collect_job_id`` of the ``Track1CollectJob`` to process.
    user_id : int
        The owning user's primary key.

    Returns
    -------
    dict  with ``status`` and ``collect_job_id``.
    """
    logger.info(
        "Celery task collect_and_calculate started: "
        "collect_job_id=%s, user_id=%d",
        collect_job_id,
        user_id,
    )

    # ── Stub implementation ───────────────────────────────────────────
    # In production, uncomment the block below and remove the stub return.
    #
    # import asyncio
    # from app.core.database import AsyncSessionLocal
    #
    # async def _run() -> dict:
    #     async with AsyncSessionLocal() as db:
    #         try:
    #             from app.services.track1_service import _process_tax_data
    #             await _process_tax_data(db, collect_job_id, user_id)
    #             await db.commit()
    #             return {"status": "DONE", "collect_job_id": collect_job_id}
    #         except Exception as exc:
    #             await db.rollback()
    #             raise self.retry(exc=exc)
    #
    # return asyncio.get_event_loop().run_until_complete(_run())

    return {"status": "STUB", "collect_job_id": collect_job_id}
