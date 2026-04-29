"""
Celery tasks for Track 2 -- Property Transfer Tax Simulation.

Provides an async (background) path for the 6-way calculation so the API
can return immediately with a ``job_id`` and the heavy computation runs
in a worker process.

Currently a **stub** -- the synchronous in-request calculation in
``track2_service.calculate()`` is the primary path.  This task can be
wired in later for large-batch or webhook-based flows.
"""

from __future__ import annotations

import logging
from datetime import date, datetime

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

__all__ = ["calculate_six_way_task"]


@celery_app.task(
    bind=True,
    name="track2.calculate_six_way",
    max_retries=2,
    default_retry_delay=5,
    acks_late=True,
)
def calculate_six_way_task(
    self,
    simulation_id: str,
    job_id: str,
    policy_date: str | None = None,
) -> dict:
    """Run the 6-way property transfer calculation asynchronously.

    This task is meant to be called from the API layer when the
    calculation should run in the background (e.g. for very large
    batch simulations or when the API needs to respond quickly).

    Parameters
    ----------
    simulation_id : str
        The simulation to calculate for.
    job_id : str
        The calc-job ID to update with results.
    policy_date : str | None
        Optional reference date (``YYYY-MM-DD``) for tax-rate lookup.
        Defaults to today if not provided.

    Returns
    -------
    dict
        ``{"status": "DONE", "simulation_id": ..., "job_id": ...}``
        on success, or ``{"status": "FAILED", ...}`` on failure.

    Notes
    -----
    **Stub implementation.**

    In production, this task would:
      1. Open a *synchronous* DB session (Celery workers are sync).
      2. Load the Track2Input for the simulation.
      3. Build a ``SixWayInput`` and call ``calculate_six_way()``.
      4. Persist ``Track2Result`` + ``Track2Scenario`` rows.
      5. Update the ``Track2CalcJob`` status to ``DONE``.
      6. Update the ``Track2Simulation`` status to ``DONE``.

    Example production skeleton::

        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session
        from app.config import settings
        from app.engines.track2 import calculate_six_way, SixWayInput
        from app.models.track2 import (
            Track2CalcJob, Track2Input, Track2Result,
            Track2Scenario, Track2Simulation,
        )

        engine = create_engine(settings.database_url_sync)
        with Session(engine) as db:
            inp = db.query(Track2Input).filter_by(simulation_id=simulation_id).one()
            six_input = SixWayInput(...)
            result = calculate_six_way(six_input)
            # ... persist result ...
    """
    logger.info(
        "calculate_six_way_task started: simulation_id=%s, job_id=%s, policy_date=%s",
        simulation_id,
        job_id,
        policy_date,
    )

    try:
        # ── Stub: simulate successful calculation ────────────────────────
        # In production, replace with actual DB access + engine call.
        ref_date = (
            datetime.strptime(policy_date, "%Y-%m-%d").date()
            if policy_date
            else date.today()
        )

        logger.info(
            "calculate_six_way_task completed (stub): "
            "simulation_id=%s, job_id=%s, ref_date=%s",
            simulation_id,
            job_id,
            ref_date.isoformat(),
        )

        return {
            "status": "DONE",
            "simulation_id": simulation_id,
            "job_id": job_id,
        }

    except Exception as exc:
        logger.exception(
            "calculate_six_way_task failed: simulation_id=%s, job_id=%s",
            simulation_id,
            job_id,
        )
        # Retry up to max_retries, then mark as FAILED
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {
                "status": "FAILED",
                "simulation_id": simulation_id,
                "job_id": job_id,
                "error": str(exc),
            }
