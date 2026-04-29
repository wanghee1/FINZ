"""
Handoff service layer – creating and querying tax-consultant referrals.

All database access for the ``handoffs`` / ``handoff_events`` tables is
encapsulated here so that routers remain thin.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.handoff import Handoff, HandoffEvent
from app.models.enums import HandoffStatusEnum
from app.models.track1 import Track1Calculation
from app.schemas.handoff import (
    HandoffEventItem,
    HandoffRequest,
    HandoffResponse,
)


async def create_handoff(
    db: AsyncSession,
    user_id: int,
    request: HandoffRequest,
) -> HandoffResponse:
    """Create a new handoff referral.

    Validates that:
    - Both consent flags are True.
    - The referenced ``calculation_id`` exists and belongs to the user.

    Creates the ``Handoff`` record together with an initial
    ``HandoffEvent`` (``"REQUESTED"``).

    Returns
    -------
    HandoffResponse  with the generated ``handoff_id``, initial status,
    and the event timeline.
    """
    # ── Validate consents ─────────────────────────────────────────────
    if not request.consent_privacy:
        raise BadRequestException(
            message="Privacy consent is required to create a handoff."
        )
    if not request.consent_partner:
        raise BadRequestException(
            message="Partner data-sharing consent is required to create a handoff."
        )

    # ── Validate calculation ownership ────────────────────────────────
    result = await db.execute(
        select(Track1Calculation).where(
            Track1Calculation.calculation_id == request.calculation_id,
            Track1Calculation.user_id == user_id,
        )
    )
    calc = result.scalar_one_or_none()
    if calc is None:
        raise NotFoundException(
            message=f"Calculation '{request.calculation_id}' not found for the current user."
        )

    # ── Create Handoff ────────────────────────────────────────────────
    handoff_id = f"ho_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    handoff = Handoff(
        handoff_id=handoff_id,
        user_id=user_id,
        calculation_id=request.calculation_id,
        contact_name=request.contact_name,
        contact_phone=request.contact_phone,
        contact_email=request.contact_email,
        consent_privacy=request.consent_privacy,
        consent_partner=request.consent_partner,
        memo=request.memo,
        status=HandoffStatusEnum.REQUESTED,
        requested_at=now,
    )
    db.add(handoff)
    await db.flush()

    # ── Create initial event ──────────────────────────────────────────
    event = HandoffEvent(
        handoff_id=handoff_id,
        event="REQUESTED",
        occurred_at=now,
    )
    db.add(event)
    await db.flush()

    return HandoffResponse(
        handoff_id=handoff_id,
        status=HandoffStatusEnum.REQUESTED.value,
        requested_at=now,
        events=[
            HandoffEventItem(event="REQUESTED", occurred_at=now),
        ],
    )


async def get_handoff(
    db: AsyncSession,
    user_id: int,
    handoff_id: str,
) -> HandoffResponse:
    """Retrieve a handoff with its full event timeline.

    Raises ``NotFoundException`` if the handoff does not exist or does
    not belong to *user_id*.
    """
    result = await db.execute(
        select(Handoff)
        .options(selectinload(Handoff.events))
        .where(
            Handoff.handoff_id == handoff_id,
            Handoff.user_id == user_id,
        )
    )
    handoff = result.scalar_one_or_none()
    if handoff is None:
        raise NotFoundException(
            message=f"Handoff '{handoff_id}' not found."
        )

    events = sorted(handoff.events, key=lambda e: e.occurred_at)
    return HandoffResponse(
        handoff_id=handoff.handoff_id,
        status=handoff.status.value,
        requested_at=handoff.requested_at,
        events=[
            HandoffEventItem(event=ev.event, occurred_at=ev.occurred_at)
            for ev in events
        ],
    )
