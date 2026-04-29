"""
Track 2 -- Property Transfer Tax Simulation API endpoints.

Prefix: ``/api/task2``

All endpoints require Bearer JWT authentication except ``GET /policy``.
Responses use the standard ``ApiResponse`` / ``PaginatedResponse`` wrappers.

Endpoints
---------
POST   /simulations                             Create simulation
GET    /simulations                             List simulations
GET    /simulations/{simulation_id}             Get simulation
PATCH  /simulations/{simulation_id}/inputs      Update inputs
GET    /realtrade                               Search real-trade
POST   /simulations/{simulation_id}/realtrade/select   Select real-trade
POST   /simulations/{simulation_id}/calculate   Calculate
GET    /simulations/{simulation_id}/result      Get result
POST   /simulations/{simulation_id}/ai-summary  AI summary
DELETE /simulations/{simulation_id}             Delete simulation
GET    /policy                                  Policy version
POST   /simulations/{simulation_id}/recalculate Recalculate
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.track2 import (
    AiSummaryRequest,
    AiSummaryResponse,
    ApartmentSearchResponse,
    CalculateRequest,
    RealtradeItem,
    RealtradeSelectRequest,
    RegionItem,
    SimulationCreateRequest,
    SimulationResponse,
    Track2InputResponse,
    Track2InputUpdate,
    Track2ResultResponse,
)
from app.services import track2_service
from app.services import realtrade_cache_service

router = APIRouter(prefix="/api/task2", tags=["track2"])


# =========================================================================
# POST /simulations -- Create a new simulation
# =========================================================================


@router.post(
    "/simulations",
    response_model=ApiResponse[SimulationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Track 2 simulation",
    description=(
        "Create a new property transfer tax simulation. "
        "The simulation starts in DRAFT status and must be populated "
        "with property inputs before calculation."
    ),
)
async def create_simulation(
    request: SimulationCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[SimulationResponse]:
    data = await track2_service.create_simulation(db, current_user.id, request)
    return ApiResponse(data=data, message="Simulation created")


# =========================================================================
# GET /simulations -- List user's simulations
# =========================================================================


@router.get(
    "/simulations",
    response_model=PaginatedResponse[SimulationResponse],
    summary="List Track 2 simulations",
    description=(
        "List all simulations owned by the authenticated user. "
        "Supports pagination and optional status filtering."
    ),
)
async def list_simulations(
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Filter by status: DRAFT, CALCULATING, DONE, FAILED",
    ),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[SimulationResponse]:
    result = await track2_service.list_simulations(
        db,
        current_user.id,
        status=status_filter,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        data=result["data"],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


# =========================================================================
# GET /simulations/{simulation_id} -- Get simulation detail
# =========================================================================


@router.get(
    "/simulations/{simulation_id}",
    response_model=ApiResponse[SimulationResponse],
    summary="Get simulation detail",
    description="Retrieve a single simulation's metadata. Verifies ownership.",
)
async def get_simulation(
    simulation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[SimulationResponse]:
    data = await track2_service.get_simulation(db, current_user.id, simulation_id)
    return ApiResponse(data=data)


# =========================================================================
# PATCH /simulations/{simulation_id}/inputs -- Update inputs
# =========================================================================


@router.patch(
    "/simulations/{simulation_id}/inputs",
    response_model=ApiResponse[Track2InputResponse],
    summary="Update simulation inputs",
    description=(
        "Create or partial-update the property A / B input data. "
        "Only the fields provided (non-null) are updated, allowing "
        "step-by-step form submission from the mobile client."
    ),
)
async def update_inputs(
    simulation_id: str,
    request: Track2InputUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Track2InputResponse]:
    data = await track2_service.update_inputs(
        db, current_user.id, simulation_id, request
    )
    return ApiResponse(data=data, message="Inputs updated")


# =========================================================================
# GET /realtrade/regions -- List regulated regions
# =========================================================================


@router.get(
    "/realtrade/regions",
    response_model=ApiResponse[dict],
    summary="List regulated regions for realtrade search",
    description=(
        "Return the list of regulated regions (조정대상지역) with their "
        "법정동코드, grouped by 시/도. No authentication required."
    ),
)
async def list_regions() -> ApiResponse[dict]:
    data = track2_service.get_regions()
    return ApiResponse(data=data)


# =========================================================================
# GET /realtrade/search -- Search apartments by keyword (6-month)
# =========================================================================


@router.get(
    "/realtrade/search",
    response_model=ApiResponse[ApartmentSearchResponse],
    summary="Search apartments by keyword with 6-month data",
    description=(
        "Search apartments in a regulated region by name or address keyword. "
        "Data is served from DB cache (auto-synced from MOLIT API). "
        "Results are grouped by apartment complex."
    ),
)
async def search_apartments(
    lawd_cd: str = Query(
        ...,
        min_length=5,
        max_length=5,
        description="Legal area code (5 digits, e.g. '11680')",
    ),
    keyword: str = Query(
        "",
        max_length=50,
        description="Apartment name or address keyword",
    ),
    end_ym: str = Query(
        "",
        max_length=6,
        description="End month YYYYMM (defaults to current month)",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ApartmentSearchResponse]:
    # DB 캐시에서 검색 (캐시 없으면 자동 동기화)
    raw = await realtrade_cache_service.search_apartments(
        db, lawd_cd, keyword, end_ym or None
    )
    data = track2_service.build_apartment_search_response(raw)
    return ApiResponse(data=data)


# =========================================================================
# GET /realtrade -- Search MOLIT real trade (legacy single-month)
# =========================================================================


@router.get(
    "/realtrade",
    response_model=ApiResponse[list[RealtradeItem]],
    summary="Search real estate transactions",
    description=(
        "Proxy to the MOLIT real-trade API. "
        "Searches for apartment transactions by district code and period."
    ),
)
async def search_realtrade(
    lawd_cd: str = Query(
        ...,
        min_length=5,
        max_length=5,
        description="Legal area code (5 digits, e.g. '11110')",
    ),
    deal_ymd: str = Query(
        ...,
        min_length=6,
        max_length=6,
        description="Deal period YYYYMM (e.g. '202501')",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[list[RealtradeItem]]:
    data = await track2_service.search_realtrade(lawd_cd, deal_ymd)
    return ApiResponse(data=data)


# =========================================================================
# POST /simulations/{id}/realtrade/select -- Select real-trade
# =========================================================================


@router.post(
    "/simulations/{simulation_id}/realtrade/select",
    response_model=ApiResponse[dict],
    summary="Select a real-trade record",
    description=(
        "Apply a real-trade transaction price to property A or B. "
        "Records the selection and updates the simulation input."
    ),
)
async def select_realtrade(
    simulation_id: str,
    request: RealtradeSelectRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    data = await track2_service.select_realtrade(
        db, current_user.id, simulation_id, request
    )
    return ApiResponse(data=data, message="Real-trade record selected")


# =========================================================================
# POST /simulations/{id}/calculate -- Run calculation
# =========================================================================


@router.post(
    "/simulations/{simulation_id}/calculate",
    response_model=ApiResponse[dict],
    summary="Run 6-way tax calculation",
    description=(
        "Trigger the 6-way property transfer tax calculation. "
        "Requires complete inputs (both property prices, acquisition prices, "
        "and acquisition dates). Returns a job ID."
    ),
)
async def calculate(
    simulation_id: str,
    request: CalculateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    data = await track2_service.calculate(
        db, current_user.id, simulation_id, request
    )
    return ApiResponse(data=data, message="Calculation completed")


# =========================================================================
# GET /simulations/{id}/result -- Get calculation result
# =========================================================================


@router.get(
    "/simulations/{simulation_id}/result",
    response_model=ApiResponse[Track2ResultResponse],
    summary="Get calculation result",
    description=(
        "Retrieve the latest 6-way calculation result with all scenario "
        "breakdowns, rankings, and risk delta."
    ),
)
async def get_result(
    simulation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Track2ResultResponse]:
    data = await track2_service.get_result(db, current_user.id, simulation_id)
    return ApiResponse(data=data)


# =========================================================================
# POST /simulations/{id}/ai-summary -- Generate AI summary
# =========================================================================


@router.post(
    "/simulations/{simulation_id}/ai-summary",
    response_model=ApiResponse[AiSummaryResponse],
    summary="Generate AI summary",
    description=(
        "Generate a Korean-language AI summary of the 6-way comparison result. "
        "Supports different tones (SHORT, DETAILED, FRIENDLY) and optional "
        "focus on specific scenario numbers. "
        "Complies with Korean tax advisory law: factual comparison only."
    ),
)
async def generate_ai_summary(
    simulation_id: str,
    request: AiSummaryRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AiSummaryResponse]:
    data = await track2_service.generate_ai_summary(
        db, current_user.id, simulation_id, request
    )
    return ApiResponse(data=data, message="AI summary generated")


# =========================================================================
# DELETE /simulations/{simulation_id} -- Delete simulation
# =========================================================================


@router.delete(
    "/simulations/{simulation_id}",
    response_model=ApiResponse,
    summary="Delete simulation",
    description=(
        "Hard-delete a simulation and all its related data "
        "(inputs, selections, results, scenarios, AI summaries). "
        "Verifies ownership before deletion."
    ),
)
async def delete_simulation(
    simulation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    await track2_service.delete_simulation(db, current_user.id, simulation_id)
    return ApiResponse(message="Simulation deleted")


# =========================================================================
# GET /policy -- Policy version (no auth required)
# =========================================================================


@router.get(
    "/policy",
    response_model=ApiResponse[dict],
    summary="Get current policy version",
    description=(
        "Return the current tax policy version and effective date. "
        "This endpoint does NOT require authentication so clients can "
        "check whether their cached results are stale."
    ),
)
async def get_policy_version(
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    data = await track2_service.get_policy_version(db)
    return ApiResponse(data=data)


# =========================================================================
# POST /simulations/{id}/recalculate -- Recalculate
# =========================================================================


@router.post(
    "/simulations/{simulation_id}/recalculate",
    response_model=ApiResponse[dict],
    summary="Recalculate simulation",
    description=(
        "Re-run the 6-way calculation, optionally with a different policy "
        "reference date. Useful after updating inputs or when policy "
        "changes require re-evaluation."
    ),
)
async def recalculate(
    simulation_id: str,
    request: CalculateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    data = await track2_service.recalculate(
        db, current_user.id, simulation_id, request
    )
    return ApiResponse(data=data, message="Recalculation completed")


# =========================================================================
# POST /realtrade/sync -- Manual sync trigger (admin)
# =========================================================================


@router.post(
    "/realtrade/sync",
    response_model=ApiResponse[dict],
    summary="Trigger realtrade cache sync",
    description=(
        "Manually trigger real-trade data synchronization for a specific region. "
        "If no lawd_cd is provided, syncs all regulated regions. "
        "Useful for initial data population or forced refresh."
    ),
)
async def trigger_sync(
    lawd_cd: str = Query("", max_length=5, description="법정동코드 (빈값이면 전체)"),
    force: bool = Query(False, description="캐시 무시하고 강제 재수집"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    if lawd_cd:
        data = await realtrade_cache_service.sync_region_6months(
            db, lawd_cd, force=force
        )
    else:
        data = await realtrade_cache_service.sync_all_regions(
            db, force=force
        )
    return ApiResponse(data=data, message="동기화 완료")


# =========================================================================
# GET /realtrade/sync-status -- Cache sync status
# =========================================================================


@router.get(
    "/realtrade/sync-status",
    response_model=ApiResponse[list],
    summary="Get realtrade cache sync status",
    description="Check which regions/months have been cached and when.",
)
async def get_sync_status(
    lawd_cd: str = Query("", max_length=5, description="법정동코드 필터"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[list]:
    data = await realtrade_cache_service.get_sync_status(
        db, lawd_cd or None
    )
    return ApiResponse(data=data)
