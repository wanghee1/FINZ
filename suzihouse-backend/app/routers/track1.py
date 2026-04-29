"""
Track 1 – Youth / Senior Income Tax Refund API endpoints.

POST /api/task1/auth/start       – 간편인증 시작 (2WAY)
POST /api/task1/auth/confirm     – 간편인증 확인 (폴링)
POST /api/task1/tax-data         – 세금 데이터 조회 + 인메모리 계산 (DB 저장 안 함)
POST /api/task1/refund/save      – 시뮬레이션 결과 저장 (사용자 "저장" 클릭 시)
GET  /api/task1/refund/result    – 최신 저장된 결과
GET  /api/task1/refund/history   – 계산 이력 (페이지네이션)
POST /api/task1/handoffs         – 세무사 연결 요청
GET  /api/task1/handoffs/{id}    – 연결 요청 상태 조회
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.codef import (
    SimpleAuthConfirmRequest,
    SimpleAuthConfirmResponse,
    SimpleAuthStartRequest,
    SimpleAuthStartResponse,
    TaxDataCollectRequest,
    TaxDataCollectResponse,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.handoff import HandoffRequest, HandoffResponse
from app.schemas.track1 import (
    Track1HistoryItem,
    Track1ResultResponse,
    Track1SaveResultRequest,
    Track1SaveResultResponse,
)
from app.services import track1_service

router = APIRouter(prefix="/api/task1", tags=["track1"])


# ═════════════════════════════════════════════════════════════════════════════
# 간편인증 (CODEF 2WAY)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/auth/start",
    response_model=ApiResponse[SimpleAuthStartResponse],
    summary="간편인증 시작",
    description=(
        "CODEF 간편인증(카카오, PASS, 토스 등)을 시작합니다. "
        "사용자의 인증앱으로 푸시가 발송되며, /auth/confirm으로 완료를 확인합니다."
    ),
)
async def auth_start(
    request: SimpleAuthStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ApiResponse[SimpleAuthStartResponse]:
    result = await track1_service.start_auth(db, request, current_user.id)
    return ApiResponse(data=result, message=result.message)


@router.post(
    "/auth/confirm",
    response_model=ApiResponse[SimpleAuthConfirmResponse],
    summary="간편인증 확인 (폴링)",
    description=(
        "간편인증 완료 여부를 확인합니다. 3초 간격으로 폴링하세요. "
        "VERIFIED 상태가 되면 /tax-data를 호출하여 데이터를 조회합니다."
    ),
)
async def auth_confirm(
    request: SimpleAuthConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ApiResponse[SimpleAuthConfirmResponse]:
    result = await track1_service.confirm_auth(db, request, current_user.id)
    return ApiResponse(data=result)


# ═════════════════════════════════════════════════════════════════════════════
# Tax Data Collection + Calculation (DB 저장 없이 인메모리 계산)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/tax-data",
    response_model=ApiResponse[TaxDataCollectResponse],
    summary="세금 데이터 조회 및 인메모리 계산",
    description=(
        "간편인증 완료 후, 연도별 근로소득 지급명세서를 CODEF에서 조회하고 "
        "환급 계산을 실행합니다. 결과는 응답에 직접 포함되며, DB에 저장하지 않습니다. "
        "저장하려면 /refund/save를 호출하세요."
    ),
)
async def request_tax_data(
    request: TaxDataCollectRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaxDataCollectResponse]:
    result = await track1_service.request_tax_data(db, request, current_user.id)
    return ApiResponse(data=result, message=result.message)


# ═════════════════════════════════════════════════════════════════════════════
# Refund Results — 저장 및 조회
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/refund/save",
    response_model=ApiResponse[Track1SaveResultResponse],
    summary="시뮬레이션 결과 저장",
    description=(
        "사용자가 '저장하기' 버튼을 눌렀을 때 호출합니다. "
        "계산 결과만 DB에 저장하며, CODEF 소득 원시 데이터는 저장하지 않습니다."
    ),
)
async def save_refund_result(
    request: Track1SaveResultRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Track1SaveResultResponse]:
    result = await track1_service.save_result(db, request, current_user.id)
    return ApiResponse(data=result, message=result.message)


@router.get(
    "/refund/result",
    response_model=ApiResponse[Track1ResultResponse],
    summary="최신 저장된 결과",
    description="가장 최근 저장된 환급 계산 결과를 반환합니다.",
)
async def get_refund_result(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Track1ResultResponse]:
    result = await track1_service.get_latest_result(db, current_user.id)
    return ApiResponse(data=result)


@router.get(
    "/refund/history",
    response_model=PaginatedResponse[Track1HistoryItem],
    summary="계산 이력",
    description="사용자의 환급 계산 이력을 페이지네이션으로 반환합니다.",
)
async def get_refund_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[Track1HistoryItem]:
    return await track1_service.get_history(db, current_user.id, page, page_size)


# ═════════════════════════════════════════════════════════════════════════════
# Handoffs
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/handoffs",
    response_model=ApiResponse[HandoffResponse],
    summary="세무사 연결 요청",
)
async def create_handoff(
    request: HandoffRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[HandoffResponse]:
    result = await track1_service.create_handoff(db, current_user.id, request)
    return ApiResponse(data=result, message="연결 요청이 생성되었습니다")


@router.get(
    "/handoffs/{handoff_id}",
    response_model=ApiResponse[HandoffResponse],
    summary="연결 요청 상태 조회",
)
async def get_handoff(
    handoff_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[HandoffResponse]:
    result = await track1_service.get_handoff(db, current_user.id, handoff_id)
    return ApiResponse(data=result)
