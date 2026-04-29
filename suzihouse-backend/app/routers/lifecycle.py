"""
Lifecycle API endpoints.

GET   /api/lifecycle/services       – Available lifecycle services by stage
GET   /api/lifecycle/notifications  – User's notification preferences
PATCH /api/lifecycle/notifications  – Update a notification preference
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.lifecycle import (
    LifecycleServiceItem,
    NotificationSettingResponse,
    NotificationUpdateRequest,
)
from app.services import notification_service

router = APIRouter(prefix="/api/lifecycle", tags=["lifecycle"])

# ── Static lifecycle service catalogue ──────────────────────────────────────
# In a real deployment this would come from the database or a config file.
# For now we hardcode the available services per lifecycle stage.

_LIFECYCLE_SERVICES: list[dict] = [
    {
        "service_id": "youth_tax_refund",
        "title": "청년 소득세 환급",
        "description": "중소기업 취업 청년 소득세 감면 경정청구",
        "stage_index": 0,
        "icon": "tax",
    },
    {
        "service_id": "property_tax_sim",
        "title": "부동산 세금 시뮬레이션",
        "description": "6-way 취득·증여·양도 세금 비교",
        "stage_index": 1,
        "icon": "home",
    },
    {
        "service_id": "marriage_tax",
        "title": "결혼 세액공제",
        "description": "혼인 관련 세액공제 안내",
        "stage_index": 2,
        "icon": "heart",
    },
    {
        "service_id": "childbirth_support",
        "title": "출산 지원금",
        "description": "출산·육아 관련 세금 혜택 안내",
        "stage_index": 3,
        "icon": "baby",
    },
]


# ── GET /api/lifecycle/services ─────────────────────────────────────────────

@router.get(
    "/services",
    response_model=ApiResponse[List[LifecycleServiceItem]],
    summary="Get available lifecycle services",
)
async def get_lifecycle_services(
    stage_index: Optional[int] = Query(
        None,
        ge=0,
        description="Filter by lifecycle stage index",
    ),
    current_user: User = Depends(get_current_active_user),
) -> ApiResponse[List[LifecycleServiceItem]]:
    if stage_index is not None:
        items = [s for s in _LIFECYCLE_SERVICES if s["stage_index"] == stage_index]
    else:
        items = _LIFECYCLE_SERVICES

    services = [LifecycleServiceItem(**s) for s in items]
    return ApiResponse(data=services)


# ── GET /api/lifecycle/notifications ────────────────────────────────────────

@router.get(
    "/notifications",
    response_model=ApiResponse[List[NotificationSettingResponse]],
    summary="Get notification settings",
)
async def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[List[NotificationSettingResponse]]:
    rows = await notification_service.get_notifications(db, current_user.id)
    settings = [NotificationSettingResponse(**r) for r in rows]
    return ApiResponse(data=settings)


# ── PATCH /api/lifecycle/notifications ──────────────────────────────────────

@router.patch(
    "/notifications",
    response_model=ApiResponse[NotificationSettingResponse],
    summary="Update a notification setting",
)
async def update_notification(
    request: NotificationUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[NotificationSettingResponse]:
    try:
        result = await notification_service.update_notification(
            db,
            current_user.id,
            request.type,
            request.enabled,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    setting = NotificationSettingResponse(**result)
    return ApiResponse(data=setting, message="Notification setting updated")
