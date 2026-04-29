"""
Track 2 -- Property Transfer Tax Simulation service layer.

All business logic for the Track 2 simulation pipeline lives here.
Router endpoints delegate to these functions to keep the API layer thin.

Functions
---------
create_simulation   : Create a new simulation (DRAFT).
list_simulations    : Paginated listing with optional status filter.
get_simulation      : Retrieve simulation metadata (with ownership check).
update_inputs       : Create or partial-update the two-property input row.
search_realtrade    : Proxy to MOLIT real-trade API.
select_realtrade    : Record a real-trade selection and apply its price.
calculate           : Run synchronous 6-way calculation.
get_result          : Retrieve the latest calculation result with scenarios.
generate_ai_summary : Generate and persist an AI summary.
delete_simulation   : Hard-delete a simulation (with ownership check).
get_policy_version  : Return current policy version information.
recalculate         : Re-run calculation (possibly with different policy date).
"""

from __future__ import annotations

import logging
import math
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.engines.track2 import SixWayInput, calculate_six_way
from app.external.molit_client import molit_client
from app.external.openai_client import openai_client
from app.models.enums import SimulationStatusEnum, TargetEnum, TransferMethodEnum
from app.models.track2 import (
    Track2AiSummary,
    Track2CalcJob,
    Track2Input,
    Track2RealtradeSelection,
    Track2Result,
    Track2Scenario,
    Track2Simulation,
)
from app.external.regions import ALL_REGIONS, REGIONS
from app.schemas.track2 import (
    AiSummaryRequest,
    AiSummaryResponse,
    ApartmentSearchResponse,
    ApartmentTradeItem,
    ApartmentGroup,
    CalculateRequest,
    RealtradeItem,
    RealtradeSelectRequest,
    ScenarioResult,
    SimulationCreateRequest,
    SimulationResponse,
    Track2InputResponse,
    Track2InputUpdate,
    Track2ResultResponse,
)

logger = logging.getLogger(__name__)

# Current policy version (bump when tax rules change)
_POLICY_VERSION = "2026-02"
_POLICY_EFFECTIVE_DATE = "2026-02-12"


# ═════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═════════════════════════════════════════════════════════════════════════════


def _generate_simulation_id() -> str:
    """Generate a unique simulation ID with a human-friendly prefix."""
    short_uuid = uuid.uuid4().hex[:12]
    return f"sim_t2_{short_uuid}"


def _generate_job_id() -> str:
    """Generate a unique calc-job ID."""
    short_uuid = uuid.uuid4().hex[:12]
    return f"job_{short_uuid}"


async def _get_simulation_or_404(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
) -> Track2Simulation:
    """Fetch a simulation by ID and verify ownership.

    Raises NotFoundException if the simulation does not exist or
    does not belong to the specified user.
    """
    result = await db.execute(
        select(Track2Simulation).where(
            Track2Simulation.simulation_id == simulation_id,
            Track2Simulation.user_id == user_id,
        )
    )
    sim = result.scalar_one_or_none()
    if sim is None:
        raise NotFoundException(
            message=f"Simulation '{simulation_id}' not found"
        )
    return sim


def _sim_to_response(sim: Track2Simulation) -> SimulationResponse:
    """Convert an ORM simulation to the response schema."""
    return SimulationResponse(
        simulation_id=sim.simulation_id,
        title=sim.title,
        status=sim.status.value if isinstance(sim.status, SimulationStatusEnum) else sim.status,
        created_at=sim.created_at,
        updated_at=sim.updated_at or sim.created_at,
    )


def _input_to_response(inp: Track2Input) -> Track2InputResponse:
    """Convert an ORM input to the response schema."""
    return Track2InputResponse(
        a_address=inp.a_address,
        a_market_price=inp.a_market_price,
        a_acquired_at=inp.a_acquired_at,
        a_acquisition_price=inp.a_acquisition_price,
        a_is_regulated=inp.a_is_regulated,
        b_address=inp.b_address,
        b_market_price=inp.b_market_price,
        b_acquired_at=inp.b_acquired_at,
        b_acquisition_price=inp.b_acquisition_price,
        b_is_regulated=inp.b_is_regulated,
        lease_deposit=inp.lease_deposit,
        loan_balance=inp.loan_balance,
        b_lease_deposit=inp.b_lease_deposit,
        b_loan_balance=inp.b_loan_balance,
        donee_relation=(
            inp.donee_relation.value
            if hasattr(inp.donee_relation, "value")
            else inp.donee_relation
        ),
        is_resident=inp.is_resident,
    )


# ═════════════════════════════════════════════════════════════════════════════
# Public API
# ═════════════════════════════════════════════════════════════════════════════


async def create_simulation(
    db: AsyncSession,
    user_id: int,
    request: SimulationCreateRequest,
) -> SimulationResponse:
    """Create a new Track 2 simulation with DRAFT status.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
        The authenticated user's ID.
    request : SimulationCreateRequest
        Contains optional ``title``.

    Returns
    -------
    SimulationResponse
    """
    sim = Track2Simulation(
        simulation_id=_generate_simulation_id(),
        user_id=user_id,
        title=request.title,
        status=SimulationStatusEnum.DRAFT,
        policy_version=_POLICY_VERSION,
    )
    db.add(sim)
    await db.flush()
    await db.refresh(sim)

    logger.info(
        "Created simulation %s for user %s",
        sim.simulation_id,
        user_id,
    )
    return _sim_to_response(sim)


async def list_simulations(
    db: AsyncSession,
    user_id: int,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """List the user's simulations with pagination and optional status filter.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    status : str | None
        If provided, filter by simulation status (e.g. ``"DRAFT"``, ``"DONE"``).
    page : int
        1-based page number.
    page_size : int
        Items per page (max 100).

    Returns
    -------
    dict
        Keys: ``data``, ``total``, ``page``, ``page_size``, ``total_pages``.
    """
    page_size = min(page_size, 100)

    # Base filter
    conditions = [Track2Simulation.user_id == user_id]
    if status:
        try:
            status_enum = SimulationStatusEnum(status)
            conditions.append(Track2Simulation.status == status_enum)
        except ValueError:
            raise BadRequestException(
                message=f"Invalid status filter: '{status}'"
            )

    # Count
    count_stmt = select(func.count()).select_from(Track2Simulation).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0
    total_pages = max(1, math.ceil(total / page_size))

    # Fetch page
    offset = (page - 1) * page_size
    stmt = (
        select(Track2Simulation)
        .where(*conditions)
        .order_by(Track2Simulation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    simulations = result.scalars().all()

    return {
        "data": [_sim_to_response(s) for s in simulations],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def get_simulation(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
) -> SimulationResponse:
    """Get a single simulation's metadata (with ownership check).

    Raises NotFoundException if not found or not owned by user.
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)
    return _sim_to_response(sim)


async def update_inputs(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
    request: Track2InputUpdate,
) -> Track2InputResponse:
    """Create or partial-update the two-property input for a simulation.

    If a ``Track2Input`` row does not yet exist for this simulation it is
    created.  Otherwise, only the fields present (non-None) in ``request``
    are updated -- this enables the mobile client to send partial updates
    as the user fills in the form step-by-step.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    simulation_id : str
    request : Track2InputUpdate
        Partial input data.  Non-None fields overwrite existing values.

    Returns
    -------
    Track2InputResponse
        The full snapshot of the input after the update.
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # Fetch existing input (if any)
    result = await db.execute(
        select(Track2Input).where(
            Track2Input.simulation_id == simulation_id,
        )
    )
    inp = result.scalar_one_or_none()

    update_data = request.model_dump(exclude_none=True)

    if inp is None:
        # Create new input row
        inp = Track2Input(simulation_id=simulation_id, **update_data)
        db.add(inp)
    else:
        # Partial update: only set non-None fields
        for field_name, value in update_data.items():
            setattr(inp, field_name, value)

    await db.flush()
    await db.refresh(inp)

    logger.info(
        "Updated inputs for simulation %s (fields: %s)",
        simulation_id,
        list(update_data.keys()),
    )
    return _input_to_response(inp)


def get_regions() -> dict:
    """Return regulated regions grouped by sido."""
    return {
        "regions": REGIONS,
        "all_regions": ALL_REGIONS,
    }


def build_apartment_search_response(raw: dict) -> ApartmentSearchResponse:
    """Convert cache service dict to ApartmentSearchResponse schema.

    Parameters
    ----------
    raw : dict
        Output from realtrade_cache_service.search_apartments()

    Returns
    -------
    ApartmentSearchResponse
    """
    apartments = []
    for apt_data in raw.get("apartments", []):
        trades = [
            ApartmentTradeItem(
                trade_id=t["trade_id"],
                area=t["area"],
                area_pyeong=t["area_pyeong"],
                deal_amount=t["deal_amount"],
                deal_amount_display=t["deal_amount_display"],
                floor=t["floor"],
                deal_date=t["deal_date"],
                is_canceled=t.get("is_canceled", False),
                dealing_type=t.get("dealing_type", ""),
                apt_dong=t.get("apt_dong", ""),
            )
            for t in apt_data.get("trades", [])
        ]
        apartments.append(
            ApartmentGroup(
                apt_name=apt_data["apt_name"],
                trade_count=apt_data["trade_count"],
                areas=apt_data["areas"],
                min_price=apt_data["min_price"],
                max_price=apt_data["max_price"],
                min_price_display=apt_data["min_price_display"],
                max_price_display=apt_data["max_price_display"],
                latest_trade_date=apt_data["latest_trade_date"],
                build_year=apt_data.get("build_year", ""),
                umd_nm=apt_data.get("umd_nm", ""),
                road_nm=apt_data.get("road_nm", ""),
                trades=trades,
            )
        )

    return ApartmentSearchResponse(
        apartments=apartments,
        total_trades=raw.get("total_trades", 0),
        filtered_trades=raw.get("filtered_trades", 0),
        period=raw.get("period", ""),
    )


async def search_realtrade(
    lawd_cd: str,
    deal_ymd: str,
) -> list[RealtradeItem]:
    """Proxy to the MOLIT real-trade API (single month).

    Parameters
    ----------
    lawd_cd : str
        5-digit legal area code.
    deal_ymd : str
        ``YYYYMM`` deal period.

    Returns
    -------
    list[RealtradeItem]
    """
    raw_items = await molit_client.search_real_trade(lawd_cd, deal_ymd)
    return [RealtradeItem(**item) for item in raw_items]


async def select_realtrade(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
    request: RealtradeSelectRequest,
) -> dict:
    """Record a real-trade selection and update the simulation input price.

    The user picks a transaction from the MOLIT search results and applies
    its price to property A or B.  We store the selection record and also
    update the corresponding ``market_price`` on the ``Track2Input``.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    simulation_id : str
    request : RealtradeSelectRequest
        Contains ``target`` (A/B), ``trade_id``, ``applied_price``.

    Returns
    -------
    dict
        ``{"status": "selected", "target": ..., "applied_price": ...}``
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # Resolve target enum
    target_enum = TargetEnum(request.target)

    # Store selection record
    selection = Track2RealtradeSelection(
        simulation_id=simulation_id,
        target=target_enum,
        trade_id=request.trade_id,
        applied_price=request.applied_price,
    )
    db.add(selection)

    # Update input price
    result = await db.execute(
        select(Track2Input).where(
            Track2Input.simulation_id == simulation_id,
        )
    )
    inp = result.scalar_one_or_none()

    if inp is None:
        # Auto-create input with the selected price
        inp = Track2Input(simulation_id=simulation_id)
        db.add(inp)
        await db.flush()

    if request.target == "A":
        inp.a_market_price = request.applied_price
    else:
        inp.b_market_price = request.applied_price

    await db.flush()

    logger.info(
        "Realtrade selected for simulation %s: target=%s, trade_id=%s, price=%s",
        simulation_id,
        request.target,
        request.trade_id,
        request.applied_price,
    )

    return {
        "status": "selected",
        "target": request.target,
        "applied_price": request.applied_price,
    }


async def calculate(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
    request: CalculateRequest,
) -> dict:
    """Run the synchronous 6-way calculation.

    Steps:
      1. Verify the simulation has complete inputs.
      2. Create a ``Track2CalcJob`` with status ``CALCULATING``.
      3. Build a ``SixWayInput`` from the ``Track2Input``.
      4. Call ``calculate_six_way()``.
      5. Persist ``Track2Result`` + ``Track2Scenario`` rows.
      6. Update the simulation status to ``DONE``.
      7. Return the ``job_id``.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    simulation_id : str
    request : CalculateRequest
        Contains optional ``policy_date``.

    Returns
    -------
    dict
        ``{"job_id": ..., "status": "DONE"}``

    Raises
    ------
    BadRequestException
        If the simulation inputs are incomplete.
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # ── 1. Load and validate inputs ──────────────────────────────────────
    result = await db.execute(
        select(Track2Input).where(
            Track2Input.simulation_id == simulation_id,
        )
    )
    inp = result.scalar_one_or_none()

    if inp is None:
        raise BadRequestException(
            message="Simulation inputs not found. Please fill in property data first."
        )

    # Validate essential fields
    if not inp.a_market_price or not inp.b_market_price:
        raise BadRequestException(
            message="Both property A and B market prices are required."
        )
    if not inp.a_acquisition_price or not inp.b_acquisition_price:
        raise BadRequestException(
            message="Both property A and B acquisition prices are required."
        )
    if not inp.a_acquired_at or not inp.b_acquired_at:
        raise BadRequestException(
            message="Both property A and B acquisition dates are required."
        )

    # ── 2. Create calc job ───────────────────────────────────────────────
    job_id = _generate_job_id()
    job = Track2CalcJob(
        job_id=job_id,
        simulation_id=simulation_id,
        policy_date=request.policy_date,
        status="CALCULATING",
    )
    db.add(job)

    # Update simulation status
    sim.status = SimulationStatusEnum.CALCULATING
    await db.flush()

    # ── 3. Build SixWayInput ─────────────────────────────────────────────
    six_input = SixWayInput(
        a_market_price=inp.a_market_price,
        a_acquisition_price=inp.a_acquisition_price,
        a_acquired_at=inp.a_acquired_at,
        a_is_regulated=inp.a_is_regulated,
        a_lease_deposit=inp.lease_deposit,
        a_loan_balance=inp.loan_balance,
        b_market_price=inp.b_market_price,
        b_acquisition_price=inp.b_acquisition_price,
        b_acquired_at=inp.b_acquired_at,
        b_is_regulated=inp.b_is_regulated,
        b_lease_deposit=inp.b_lease_deposit,
        b_loan_balance=inp.b_loan_balance,
        donee_relation=(
            inp.donee_relation.value
            if hasattr(inp.donee_relation, "value")
            else inp.donee_relation
        ),
        reference_date=request.policy_date or date.today(),
    )

    # ── 4. Run calculation ───────────────────────────────────────────────
    try:
        six_result = calculate_six_way(six_input)
    except Exception as exc:
        logger.exception(
            "Calculation failed for simulation %s", simulation_id
        )
        job.status = "FAILED"
        sim.status = SimulationStatusEnum.FAILED
        await db.flush()
        raise BadRequestException(
            message="계산 처리 중 오류가 발생했습니다. 입력값을 확인해주세요."
        )

    # ── 5. Persist results ───────────────────────────────────────────────
    now = datetime.now(timezone.utc)

    track2_result = Track2Result(
        simulation_id=simulation_id,
        job_id=job_id,
        base_scenario_no=1,
        policy_version=_POLICY_VERSION,
        calculated_at=now,
    )
    db.add(track2_result)
    await db.flush()
    await db.refresh(track2_result)

    for sd in six_result.scenarios:
        scenario = Track2Scenario(
            result_id=track2_result.id,
            scenario_no=sd.scenario_no,
            label=sd.label,
            target=TargetEnum(sd.target),
            method=TransferMethodEnum(sd.method),
            pre_capital_gains_tax=sd.pre_capital_gains_tax,
            pre_gift_tax=sd.pre_gift_tax,
            pre_acquisition_tax=sd.pre_acquisition_tax,
            pre_total=sd.pre_total,
            post_capital_gains_tax=sd.post_capital_gains_tax,
            post_gift_tax=sd.post_gift_tax,
            post_acquisition_tax=sd.post_acquisition_tax,
            post_total=sd.post_total,
            diff_from_base=sd.pre_total - six_result.scenarios[0].pre_total,
            surcharge_increase=sd.surcharge_increase,
        )
        db.add(scenario)

    # ── 6. Update statuses ───────────────────────────────────────────────
    job.status = "DONE"
    job.completed_at = now
    sim.status = SimulationStatusEnum.DONE
    await db.flush()

    logger.info(
        "Calculation completed for simulation %s, job %s",
        simulation_id,
        job_id,
    )

    return {"job_id": job_id, "status": "DONE"}


async def get_result(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
) -> Track2ResultResponse:
    """Get the latest calculation result with all scenarios.

    Raises NotFoundException if no result exists for the simulation.
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # Fetch the latest result with eagerly loaded scenarios
    result = await db.execute(
        select(Track2Result)
        .where(Track2Result.simulation_id == simulation_id)
        .options(selectinload(Track2Result.scenarios))
        .order_by(Track2Result.calculated_at.desc())
        .limit(1)
    )
    track2_result = result.scalar_one_or_none()

    if track2_result is None:
        raise NotFoundException(
            message=f"No calculation result found for simulation '{simulation_id}'"
        )

    # Build scenario response list
    scenario_responses = []
    for s in sorted(track2_result.scenarios, key=lambda x: x.scenario_no):
        scenario_responses.append(
            ScenarioResult(
                scenario_no=s.scenario_no,
                label=s.label or "",
                target=s.target.value if hasattr(s.target, "value") else s.target,
                method=s.method.value if hasattr(s.method, "value") else s.method,
                pre_capital_gains_tax=s.pre_capital_gains_tax,
                pre_gift_tax=s.pre_gift_tax,
                pre_acquisition_tax=s.pre_acquisition_tax,
                pre_total=s.pre_total,
                post_capital_gains_tax=s.post_capital_gains_tax,
                post_gift_tax=s.post_gift_tax,
                post_acquisition_tax=s.post_acquisition_tax,
                post_total=s.post_total,
                diff_from_base=s.diff_from_base,
                surcharge_increase=s.surcharge_increase,
            )
        )

    # Compute rankings from stored scenarios
    rank_pre = [
        s.scenario_no
        for s in sorted(scenario_responses, key=lambda x: x.pre_total)
    ]
    rank_post = [
        s.scenario_no
        for s in sorted(scenario_responses, key=lambda x: x.post_total)
    ]

    optimal_pre = rank_pre[0] if rank_pre else 0
    optimal_post = rank_post[0] if rank_post else 0

    all_post = [s.post_total for s in scenario_responses]
    all_pre = [s.pre_total for s in scenario_responses]
    risk_delta = (max(all_post) - min(all_pre)) if all_post and all_pre else 0

    return Track2ResultResponse(
        simulation_id=simulation_id,
        scenarios=scenario_responses,
        rank_pre=rank_pre,
        rank_post=rank_post,
        optimal_pre=optimal_pre,
        optimal_post=optimal_post,
        risk_delta=risk_delta,
        calculated_at=track2_result.calculated_at or datetime.now(timezone.utc),
    )


async def generate_ai_summary(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
    request: AiSummaryRequest,
) -> AiSummaryResponse:
    """Generate and store an AI summary of the simulation result.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    simulation_id : str
    request : AiSummaryRequest
        Contains ``tone`` and optional ``focus`` scenario list.

    Returns
    -------
    AiSummaryResponse

    Raises
    ------
    NotFoundException
        If no calculation result exists for the simulation.
    """
    # Ensure simulation exists and user owns it
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # Get the result (reuse get_result for consistency)
    result_resp = await get_result(db, user_id, simulation_id)

    # Build dict for the OpenAI client
    result_dict = result_resp.model_dump()

    # Generate summary text
    now = datetime.now(timezone.utc)
    text = await openai_client.generate_tax_summary(
        six_way_result=result_dict,
        tone=request.tone,
        focus=request.focus,
    )

    # Persist
    ai_summary = Track2AiSummary(
        simulation_id=simulation_id,
        tone=request.tone,
        focus=request.focus,
        text=text,
        generated_at=now,
    )
    db.add(ai_summary)
    await db.flush()

    logger.info(
        "AI summary generated for simulation %s (tone=%s)",
        simulation_id,
        request.tone,
    )

    return AiSummaryResponse(
        text=text,
        generated_at=now,
    )


async def delete_simulation(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
) -> None:
    """Delete a simulation (hard delete). Verifies ownership first.

    All related records (inputs, selections, jobs, results, scenarios,
    AI summaries) are cascade-deleted by the database.
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    await db.delete(sim)
    await db.flush()

    logger.info(
        "Deleted simulation %s for user %s",
        simulation_id,
        user_id,
    )


async def get_policy_version(db: AsyncSession) -> dict:
    """Return current policy version information.

    This is a public endpoint (no auth required) so clients can check
    whether their cached results are stale.

    Returns
    -------
    dict
        ``{"policy_version": ..., "effective_date": ..., "description": ...}``
    """
    return {
        "policy_version": _POLICY_VERSION,
        "effective_date": _POLICY_EFFECTIVE_DATE,
        "description": "2026년 부동산 세제 기준 (양도소득세, 증여세, 취득세, 2.12 정책 변경 계약일 기준)",
    }


async def recalculate(
    db: AsyncSession,
    user_id: int,
    simulation_id: str,
    request: CalculateRequest,
) -> dict:
    """Re-run the 6-way calculation, potentially with a different policy date.

    This is functionally identical to ``calculate()`` but explicitly
    intended for re-computation after the user adjusts inputs or wants
    to evaluate a different reference date.

    Parameters
    ----------
    db : AsyncSession
    user_id : int
    simulation_id : str
    request : CalculateRequest

    Returns
    -------
    dict
        ``{"job_id": ..., "status": "DONE"}``
    """
    sim = await _get_simulation_or_404(db, user_id, simulation_id)

    # Reset status back to DRAFT so calculate() can proceed
    sim.status = SimulationStatusEnum.DRAFT
    await db.flush()

    return await calculate(db, user_id, simulation_id, request)
