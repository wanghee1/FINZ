"""
Handoff schemas – transferring a calculation to a professional tax consultant.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class HandoffEventItem(BaseModel):
    """Single event in the handoff timeline."""

    event: str
    occurred_at: datetime


class HandoffRequest(BaseModel):
    """Body for POST /handoff – initiate a consultant handoff."""

    calculation_id: str
    contact_name: str = Field(..., min_length=1, max_length=50)
    contact_phone: str
    contact_email: Optional[EmailStr] = None
    consent_privacy: bool = Field(
        ..., description="User has consented to privacy policy"
    )
    consent_partner: bool = Field(
        ..., description="User has consented to partner data sharing"
    )
    memo: Optional[str] = Field(None, max_length=500)


class HandoffResponse(BaseModel):
    """Handoff status and event history."""

    handoff_id: str
    status: str
    requested_at: datetime
    events: List[HandoffEventItem]
