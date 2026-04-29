"""
User profile schemas for read / update operations outside the auth flow.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserProfileUpdate(BaseModel):
    """Body for PATCH /users/me – partial update."""

    name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(
        None,
        pattern=r"^01[016789]-?\d{3,4}-?\d{4}$",
    )
    stage_index: Optional[int] = Field(None, ge=0)


class UserProfileResponse(BaseModel):
    """Full user profile returned by user endpoints."""

    id: int
    email: str
    name: str
    birth_date: date
    gender: str
    phone: Optional[str] = None
    stage_index: int
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
