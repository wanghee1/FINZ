"""
Lifecycle / notification schemas for request and response bodies.
"""

from typing import Optional

from pydantic import BaseModel, Field


class NotificationSettingResponse(BaseModel):
    """Single notification preference."""

    type: str
    enabled: bool


class NotificationUpdateRequest(BaseModel):
    """Body for PATCH /api/lifecycle/notifications."""

    type: str = Field(..., description="Notification type: SEASON | LIFECYCLE | SYSTEM")
    enabled: bool = Field(..., description="Whether the notification is on")


class LifecycleServiceItem(BaseModel):
    """A lifecycle-stage service entry returned by the services endpoint."""

    service_id: str
    title: str
    description: str
    stage_index: int
    icon: Optional[str] = None
