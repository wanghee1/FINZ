"""
Track 1 service layer – CODEF 간편인증, 근로소득 지급명세서 조회,
적격성 판정, 다년도 환급 계산, 핸드오프 처리.

핵심 원칙:
- CODEF API에서 가져온 소득 데이터는 절대 DB에 저장하지 않음 (계산에만 활용)
- 시뮬레이션 결과는 사용자가 "저장" 버튼을 누를 때만 DB에 저장

간편인증 2WAY 흐름 (ex.js 기반):
1. start_auth()  → paystatement-list 1차 요청 (CF-03002 → WAITING_2WAY)
2. confirm_auth() → paystatement-list 2차 요청 (인증 완료 → commSession 확보)
3. request_tax_data() → paystatement-income에 session=commSession으로 연도별 조회
   → 인메모리 계산 → 결과 응답에 직접 포함 (DB 저장 안 함)
4. save_result() → 사용자 "저장" 클릭 시에만 DB에 저장
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone


def _utcnow() -> datetime:
    """Return current UTC time as a naive datetime (SQLite compatible)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.engines.track1 import (
    InputYearData,
    calc_military_months,
    calc_multi_year_refund,
    calc_tax_age,
    judge_eligibility,
)
from app.external.codef_client import SIMPLE_AUTH_PROVIDERS, codef_client
from app.external.codef_parser import PaystatementParser
from app.models.enums import (
    AuthProcessStatusEnum,
    CalcCaseEnum,
    CalcStatusEnum,
    CollectJobStatusEnum,
    EmploymentTypeEnum,
    IncomeDataSourceEnum,
)
from app.models.track1 import (
    Track1AuthRequest,
    Track1Calculation,
    Track1CollectJob,
    Track1IncomeYear,
    Track1UserProfile,
    Track1YearResult,
)
from app.schemas.codef import (
    CalculationResultInline,
    SimpleAuthConfirmRequest,
    SimpleAuthConfirmResponse,
    SimpleAuthStartRequest,
    SimpleAuthStartResponse,
    TaxDataCollectRequest,
    TaxDataCollectResponse,
    YearResultInline,
)
from app.schemas.common import PaginatedResponse
from app.schemas.handoff import HandoffRequest, HandoffResponse
from app.schemas.track1 import (
    Track1HistoryItem,
    Track1ResultResponse,
    Track1SaveResultRequest,
    Track1SaveResultResponse,
    Track1YearResultResponse,
)
from app.services import handoff_service

logger = logging.getLogger(__name__)

_paystatement_parser = PaystatementParser()

# 2WAY 타임아웃: 270초 (4분 30초)
_TWO_WAY_TIMEOUT_SEC = 270


# ═════════════════════════════════════════════════════════════════════════════
# CODEF 간편인증 — paystatement-list 기반 세션 확보
# ═════════════════════════════════════════════════════════════════════════════

async def start_auth(
    db: AsyncSession,
    request: SimpleAuthStartRequest,
    user_id: int,
) -> SimpleAuthStartResponse:
    """간편인증 1차 요청: paystatement-list API로 간편인증 시작 + 세션 확보."""
    provider = request.auth_provider.lower()
    login_type_level = SIMPLE_AUTH_PROVIDERS.get(provider)
    if not login_type_level:
        raise BadRequestException(
            message=f"지원하지 않는 인증 수단: {request.auth_provider}. "
            f"가능: {', '.join(SIMPLE_AUTH_PROVIDERS.keys())}"
        )

    session_id = f"user_{user_id}_{uuid.uuid4().hex[:8]}"
    auth_request_id = f"authreq_{uuid.uuid4().hex[:12]}"

    codef_resp = await codef_client.start_simple_auth(
        login_type_level=login_type_level,
        user_name=request.user_name,
        identity=request.user_birth,
        phone_no=request.user_mobile,
        telecom=request.telecom,
        session_id=session_id,
    )

    status = codef_resp.get("status", "FAILED")
    now = _utcnow()

    auth_req = Track1AuthRequest(
        auth_request_id=auth_request_id,
        user_id=user_id,
        organization="hometax",
        login_type="5",
        auth_provider=provider,
        login_type_level=login_type_level,
        user_name=request.user_name,
        user_birth=request.user_birth,
        user_mobile=request.user_mobile,
        telecom=request.telecom,
        codef_session_id=session_id,
    )

    if status == "WAITING_2WAY":
        two_way = codef_resp.get("two_way_info", {})
        auth_req.job_index = two_way.get("jobIndex", 0)
        auth_req.thread_index = two_way.get("threadIndex", 0)
        auth_req.two_way_jti = two_way.get("jti", "")
        auth_req.two_way_timestamp = two_way.get("twoWayTimestamp", 0)
        auth_req.process_status = AuthProcessStatusEnum.WAITING_2WAY
        auth_req.two_way_timeout_at = now + timedelta(seconds=_TWO_WAY_TIMEOUT_SEC)
        message = "인증 앱에서 인증을 완료해주세요"

    elif status == "VERIFIED":
        auth_req.process_status = AuthProcessStatusEnum.VERIFIED
        auth_req.verified_at = now
        message = "인증이 완료되었습니다"

        list_data = codef_resp.get("data")
        comm_session = _extract_comm_session(list_data)
        if comm_session:
            await _save_session_data(
                db, auth_request_id, user_id, session_id,
                comm_session=comm_session,
            )

    else:
        auth_req.process_status = AuthProcessStatusEnum.FAILED
        auth_req.external_status = codef_resp.get("error_code", "")
        message = codef_resp.get("error_message", "인증 요청에 실패했습니다")

    db.add(auth_req)
    await db.commit()

    logger.info("Auth started: id=%s provider=%s status=%s", auth_request_id, provider, status)

    return SimpleAuthStartResponse(
        auth_request_id=auth_request_id,
        auth_provider=provider,
        status=status,
        timeout_sec=_TWO_WAY_TIMEOUT_SEC,
        polling_hint_sec=3,
        message=message,
    )


async def confirm_auth(
    db: AsyncSession,
    request: SimpleAuthConfirmRequest,
    user_id: int,
) -> SimpleAuthConfirmResponse:
    """간편인증 2차 요청: paystatement-list에 2WAY 확인 → commSession 확보."""
    result = await db.execute(
        select(Track1AuthRequest).where(
            Track1AuthRequest.auth_request_id == request.auth_request_id,
            Track1AuthRequest.user_id == user_id,
        )
    )
    auth_req = result.scalar_one_or_none()
    if auth_req is None:
        raise NotFoundException(
            message=f"인증 요청 '{request.auth_request_id}'을 찾을 수 없습니다."
        )

    if auth_req.process_status in (
        AuthProcessStatusEnum.VERIFIED,
        AuthProcessStatusEnum.FAILED,
        AuthProcessStatusEnum.EXPIRED,
    ):
        return SimpleAuthConfirmResponse(
            auth_request_id=auth_req.auth_request_id,
            status=auth_req.process_status.value,
            verified_at=auth_req.verified_at,
            message=_status_message(auth_req.process_status),
        )

    now = _utcnow()
    if auth_req.two_way_timeout_at and now > auth_req.two_way_timeout_at:
        auth_req.process_status = AuthProcessStatusEnum.EXPIRED
        await db.commit()
        return SimpleAuthConfirmResponse(
            auth_request_id=auth_req.auth_request_id,
            status="EXPIRED",
            message="인증 시간이 만료되었습니다. 다시 시도해주세요.",
        )

    two_way_info = {
        "jobIndex": auth_req.job_index or 0,
        "threadIndex": auth_req.thread_index or 0,
        "jti": auth_req.two_way_jti or "",
        "twoWayTimestamp": auth_req.two_way_timestamp or 0,
    }

    codef_resp = await codef_client.confirm_simple_auth(
        login_type_level=auth_req.login_type_level or "1",
        user_name=auth_req.user_name or "",
        identity=auth_req.user_birth or "",
        phone_no=auth_req.user_mobile or "",
        telecom=auth_req.telecom or "",
        session_id=auth_req.codef_session_id or "",
        two_way_info=two_way_info,
        simple_auth="1",
    )

    status = codef_resp.get("status", "FAILED")

    logger.info(
        "CODEF confirm_auth response: status=%s, data_type=%s",
        status, type(codef_resp.get("data")).__name__,
    )

    if status == "VERIFIED":
        auth_req.process_status = AuthProcessStatusEnum.VERIFIED
        auth_req.verified_at = now

        list_data = codef_resp.get("data")
        comm_session = _extract_comm_session(list_data)

        if comm_session:
            logger.info("commSession 확보 성공: %s", comm_session[:30])
            await _save_session_data(
                db,
                auth_req.auth_request_id,
                user_id,
                auth_req.codef_session_id or "",
                comm_session=comm_session,
            )
        else:
            logger.warning("Auth confirmed but no commSession found.")

        message = "인증이 완료되었습니다"

    elif status == "WAITING_2WAY":
        new_two_way = codef_resp.get("two_way_info", {})
        if new_two_way.get("jti"):
            auth_req.two_way_jti = new_two_way["jti"]
            auth_req.two_way_timestamp = new_two_way.get("twoWayTimestamp", 0)
            auth_req.job_index = new_two_way.get("jobIndex", 0)
            auth_req.thread_index = new_two_way.get("threadIndex", 0)
        message = "인증 앱에서 인증을 완료해주세요"

    else:
        auth_req.process_status = AuthProcessStatusEnum.FAILED
        auth_req.external_status = codef_resp.get("error_code", "")
        message = codef_resp.get("error_message", "인증에 실패했습니다")

    await db.commit()

    return SimpleAuthConfirmResponse(
        auth_request_id=auth_req.auth_request_id,
        status=auth_req.process_status.value,
        verified_at=auth_req.verified_at,
        message=message,
    )


def _extract_comm_session(data) -> str:
    """CODEF 응답 data에서 commSession 추출."""
    if isinstance(data, dict):
        return data.get("commSession", "")
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("commSession"):
                return item["commSession"]
    return ""


async def _save_session_data(
    db: AsyncSession,
    auth_request_id: str,
    user_id: int,
    session_id: str,
    *,
    comm_session: str,
) -> None:
    """간편인증 완료 시 commSession만 저장 (CODEF 소득 데이터는 저장하지 않음)."""
    logger.info("Saving session: commSession=%s", repr(comm_session)[:50])

    collect_job_id = f"cj_{uuid.uuid4().hex[:12]}"
    job = Track1CollectJob(
        collect_job_id=collect_job_id,
        auth_request_id=auth_request_id,
        user_id=user_id,
        years=[],
        include_types=["paystatement"],
        status=CollectJobStatusEnum.DONE,
        raw_data={
            "session_id": session_id,
            "comm_session": comm_session,
        },
        completed_at=_utcnow(),
    )
    db.add(job)
    await db.commit()


def _parse_date_str(s: str | None) -> "date_type | None":
    """YYYYMMDD 또는 YYYY-MM-DD → date."""
    if not s:
        return None
    from datetime import date as date_type
    clean = s.replace("-", "")
    if len(clean) != 8:
        return None
    try:
        return date_type(int(clean[:4]), int(clean[4:6]), int(clean[6:8]))
    except (ValueError, IndexError):
        return None


# ═════════════════════════════════════════════════════════════════════════════
# Tax Data Collection & Calculation — DB 저장 없이 인메모리 계산
# ═════════════════════════════════════════════════════════════════════════════

async def request_tax_data(
    db: AsyncSession,
    request: TaxDataCollectRequest,
    user_id: int,
) -> TaxDataCollectResponse:
    """인증 완료 후 다년도 지급명세서 조회 + 인메모리 계산.

    CODEF API 데이터는 DB에 저장하지 않고 계산에만 활용합니다.
    계산 결과를 응답에 직접 포함하여 반환합니다.
    사용자가 "저장" 버튼을 누를 때만 save_result()로 DB에 저장됩니다.
    """
    # 1. Verify auth
    result = await db.execute(
        select(Track1AuthRequest).where(
            Track1AuthRequest.auth_request_id == request.auth_request_id,
            Track1AuthRequest.user_id == user_id,
        )
    )
    auth_req = result.scalar_one_or_none()
    if auth_req is None:
        raise NotFoundException(
            message=f"인증 요청 '{request.auth_request_id}'을 찾을 수 없습니다."
        )
    if auth_req.process_status != AuthProcessStatusEnum.VERIFIED:
        raise BadRequestException(
            message=f"인증이 완료되지 않았습니다 (현재: {auth_req.process_status.value})"
        )

    # 2. Get commSession from saved session data
    session_job_result = await db.execute(
        select(Track1CollectJob).where(
            Track1CollectJob.auth_request_id == auth_req.auth_request_id,
            Track1CollectJob.user_id == user_id,
        ).order_by(Track1CollectJob.created_at.desc()).limit(1)
    )
    session_job = session_job_result.scalar_one_or_none()

    comm_session = ""
    if session_job and session_job.raw_data:
        comm_session = session_job.raw_data.get("comm_session", "")

    # 3. Filter years
    current_year = _utcnow().year
    requested_years = request.years or []
    filtered_years = [y for y in requested_years if y < current_year]
    if not filtered_years:
        filtered_years = list(range(current_year - 5, current_year))

    # 4. CODEF 연도별 데이터 조회 (인메모리만, DB 저장 안 함)
    parsed_years: dict = {}
    no_income_years: list[int] = []

    if comm_session:
        try:
            await _fetch_by_session(
                auth_req=auth_req,
                comm_session=comm_session,
                target_years=filtered_years,
                parsed_years=parsed_years,
            )
        except Exception:
            logger.exception("CODEF data fetch failed")
            return TaxDataCollectResponse(
                status="FAILED",
                message="데이터 수집 중 오류가 발생했습니다.",
            )
    else:
        logger.warning("No commSession available. 연도별 조회 불가.")
        return TaxDataCollectResponse(
            status="FAILED",
            message="인증 세션이 만료되었습니다. 간편인증을 다시 시도해주세요.",
        )

    # 5. 소득 데이터 없는 연도 필터링
    for year_val, parsed in list(parsed_years.items()):
        if parsed.total_salary == 0 and parsed.calculated_tax == 0:
            logger.info("Year %d: 소득 데이터 없음 (total_salary=0, calculated_tax=0)", year_val)
            no_income_years.append(year_val)
            del parsed_years[year_val]

    data_years_found = len(parsed_years)

    logger.info(
        "CODEF data: %d years with data, %d years without data (no_income=%s)",
        data_years_found, len(no_income_years), sorted(no_income_years),
    )

    if data_years_found == 0:
        return TaxDataCollectResponse(
            status="DONE",
            message="인증은 성공했으나 조회된 소득 데이터가 없습니다. 수동 입력을 이용해주세요.",
            data_years_found=0,
            no_income_years=sorted(no_income_years),
        )

    # 6. 인메모리 계산 (DB 저장 없음)
    calc_result = await _calculate_in_memory(
        request=request,
        auth_req=auth_req,
        parsed_years=parsed_years,
        all_years=filtered_years,
        no_income_years=no_income_years,
        db=db,
        user_id=user_id,
    )

    message = f"데이터 조회 및 계산이 완료되었습니다 ({data_years_found}개 연도 조회 성공)"
    if no_income_years:
        years_str = ", ".join(str(y) for y in sorted(no_income_years))
        message += f"\n{years_str}년도는 근로소득 데이터가 없어 계산에서 제외되었습니다."

    return TaxDataCollectResponse(
        status="DONE",
        message=message,
        data_years_found=data_years_found,
        no_income_years=sorted(no_income_years),
        calculation_result=calc_result,
    )


async def _calculate_in_memory(
    *,
    request: TaxDataCollectRequest,
    auth_req: Track1AuthRequest,
    parsed_years: dict,
    all_years: list[int],
    no_income_years: list[int],
    db: AsyncSession,
    user_id: int,
) -> CalculationResultInline:
    """인메모리에서 적격성 판정 + 다년도 환급 계산. DB 저장 없음."""
    from app.models.enums import GenderEnum

    # 프로필 정보 구성 (인메모리)
    birth_date = _parse_date_str(request.employment_date and auth_req.user_birth)
    if not birth_date and auth_req.user_birth:
        birth_date = _parse_date_str(auth_req.user_birth)

    hire_date = _parse_date_str(request.employment_date)
    gender_str = (request.gender or "M").upper()

    # 프로필 불완전 → 기본 결과 (소득 데이터만 표시)
    if birth_date is None or hire_date is None:
        logger.info("Profile incomplete (birth=%s, hire=%s), returning income data only", birth_date, hire_date)
        year_results = []
        for year_val in sorted(all_years):
            if year_val in parsed_years:
                p = parsed_years[year_val]
                year_results.append(YearResultInline(
                    year=year_val,
                    total_salary=p.total_salary,
                    calculated_tax=p.calculated_tax,
                    wage_tax_credit_before_red=p.wage_tax_credit_before_red,
                    originally_reported_final_tax=p.reported_final_tax,
                    reduction_applied=bool(p.reported_reduction),
                    has_income_data=True,
                ))
            elif year_val in no_income_years:
                year_results.append(YearResultInline(
                    year=year_val, has_income_data=False,
                ))

        return CalculationResultInline(
            employment_type="NONE",
            reduction_rate=0.0,
            total_estimated_refund=0,
            total_local_tax_refund=0,
            year_results=year_results,
        )

    # 군복무 계산
    military_months = 0
    if request.has_military and request.enlist_date and request.discharge_date:
        enlist = _parse_date_str(request.enlist_date)
        discharge = _parse_date_str(request.discharge_date)
        if enlist and discharge:
            military_months = calc_military_months(enlist, discharge)

    # 적격성 판정
    tax_age = calc_tax_age(
        birth_date=birth_date,
        hire_date=hire_date,
        military_months=military_months,
        gender=gender_str,
    )

    eligibility = judge_eligibility(
        birth_date=birth_date,
        gender=gender_str,
        first_sme_hire_date=hire_date,
        military_months=military_months,
        tax_age=tax_age,
    )

    # InputYearData 구성 (인메모리)
    years_input: list[InputYearData] = []
    for year in sorted(all_years):
        if year in parsed_years:
            p = parsed_years[year]
            years_input.append(InputYearData(
                year=year,
                reduction_rate=eligibility.reduction_rate,
                calculated_tax=p.calculated_tax,
                wage_tax_credit_before_red=p.wage_tax_credit_before_red,
                originally_reported_reduction=p.reported_reduction,
                originally_reported_final_tax=p.reported_final_tax,
                total_salary=p.total_salary,
                salary_from_sme=p.salary_from_sme,
                earned_income_amount=p.earned_income_amount,
                other_income_amount=p.other_income_amount,
            ))
        else:
            # 소득 데이터 없는 연도 → 빈 데이터
            years_input.append(InputYearData(
                year=year,
                reduction_rate=eligibility.reduction_rate,
                calculated_tax=0,
                wage_tax_credit_before_red=0,
                originally_reported_reduction=0,
                originally_reported_final_tax=0,
                total_salary=0,
                salary_from_sme=0,
                earned_income_amount=0,
                other_income_amount=0,
            ))

    # 다년도 환급 계산
    multi_result = calc_multi_year_refund(
        years_data=years_input,
        eligible_years=eligibility.eligible_years,
    )

    # 결과 구성 (인라인)
    year_results_inline: list[YearResultInline] = []
    for detail in multi_result.year_results:
        has_data = detail.year in parsed_years
        p = parsed_years.get(detail.year)

        year_results_inline.append(YearResultInline(
            year=detail.year,
            total_salary=p.total_salary if p else 0,
            calculated_tax=p.calculated_tax if p else 0,
            wage_tax_credit_before_red=p.wage_tax_credit_before_red if p else 0,
            originally_reported_final_tax=p.reported_final_tax if p else 0,
            reduction_applied=bool(p.reported_reduction) if p else False,
            has_income_data=has_data,
            annual_limit=detail.reduction.annual_limit if detail.reduction else 0,
            raw_reduction=detail.reduction.raw_reduction if detail.reduction else 0,
            reduction_amount=detail.reduction.reduction_amount if detail.reduction else 0,
            wage_credit_after=detail.reduction.wage_credit_after if detail.reduction else 0,
            corrected_final_tax=detail.reduction.corrected_final_tax if detail.reduction else 0,
            refund_income_tax=detail.refund.refund_income_tax if detail.refund else 0,
            refund_local_tax=detail.refund.refund_local_tax if detail.refund else 0,
            refund_total=detail.refund.refund_total if detail.refund else 0,
            calc_case=detail.calc_case or "SKIPPED",
        ))

    # 소득 데이터 없는 연도도 추가
    result_years = {yr.year for yr in year_results_inline}
    for year_val in sorted(no_income_years):
        if year_val not in result_years:
            year_results_inline.append(YearResultInline(
                year=year_val, has_income_data=False,
            ))

    year_results_inline.sort(key=lambda x: x.year)

    return CalculationResultInline(
        employment_type=eligibility.employment_type,
        reduction_rate=eligibility.reduction_rate,
        total_estimated_refund=multi_result.total_estimated_refund,
        total_local_tax_refund=multi_result.total_local_tax_refund,
        year_results=year_results_inline,
    )


def _normalize_codef_data(data) -> dict | None:
    """CODEF data 응답을 dict로 정규화."""
    if isinstance(data, dict):
        return data if data else None
    if isinstance(data, list):
        if len(data) == 1 and isinstance(data[0], dict):
            return data[0]
        if len(data) == 0:
            return None
        if isinstance(data[0], dict):
            return data[0]
    return None


async def _fetch_by_session(
    *,
    auth_req: Track1AuthRequest,
    comm_session: str,
    target_years: list[int],
    parsed_years: dict,
) -> None:
    """commSession 기반 연도별 근로소득 지급명세서 조회.

    CODEF 데이터는 parsed_years dict에만 저장 (인메모리).
    DB에는 절대 저장하지 않습니다.
    """
    logger.info(
        "Fetching by session: %d years, commSession=%s...",
        len(target_years), comm_session[:30] if comm_session else "EMPTY",
    )

    for idx, year in enumerate(sorted(target_years)):
        if idx > 0:
            await asyncio.sleep(3)

        try:
            logger.info(
                ">>> [%d/%d] Querying paystatement-income year=%d (session reuse)...",
                idx + 1, len(target_years), year,
            )
            resp = await asyncio.wait_for(
                codef_client.get_paystatement_by_session(
                    login_type_level=auth_req.login_type_level or "1",
                    user_name=auth_req.user_name or "",
                    identity=auth_req.user_birth or "",
                    phone_no=auth_req.user_mobile or "",
                    telecom=auth_req.telecom or "",
                    year=str(year),
                    comm_session=comm_session,
                    session_id=auth_req.codef_session_id or "",
                ),
                timeout=300.0,
            )

            status = resp.get("status", "")
            effective_data = _normalize_codef_data(resp.get("data"))

            logger.info(
                "CODEF year %d: status=%s, has_data=%s",
                year, status, bool(effective_data),
            )

            if status == "VERIFIED" and effective_data:
                _process_paystatement_response(
                    effective_data, parsed_years, label=f"year={year}",
                )
            elif status == "WAITING_2WAY":
                logger.warning("Year %d: session expired, stopping", year)
                break
            else:
                logger.warning(
                    "Year %d failed: status=%s error=%s",
                    year, status, resp.get("error_code", "?"),
                )
        except asyncio.TimeoutError:
            logger.warning("CODEF timeout for year %d", year)
        except Exception:
            logger.exception("Failed to fetch year %d", year)


def _process_paystatement_response(
    data: dict,
    parsed_years: dict,
    *,
    label: str = "",
) -> None:
    """CODEF 응답 데이터를 파싱하여 parsed_years에 추가 (인메모리만)."""
    has_paystatement = any(
        k in data for k in ("resIncomeSpecList", "resSettlementSpecList", "resAttrYear")
    )
    if not has_paystatement:
        logger.info("CODEF %s: no paystatement data (keys=%s)", label, list(data.keys())[:10])
        return

    parsed = _paystatement_parser.parse(data)
    year = parsed.attr_year

    if not year:
        logger.warning("CODEF %s: parsed but no attr_year", label)
        return

    parsed_years[year] = parsed
    logger.info(
        "CODEF %s: year=%d total_salary=%d calculated_tax=%d",
        label, year, parsed.total_salary, parsed.calculated_tax,
    )


# ═════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 결과 저장 — 사용자가 "저장" 클릭 시에만 호출
# ═════════════════════════════════════════════════════════════════════════════

async def save_result(
    db: AsyncSession,
    request: Track1SaveResultRequest,
    user_id: int,
) -> Track1SaveResultResponse:
    """시뮬레이션 결과를 DB에 저장.

    사용자가 "저장하기" 버튼을 누를 때만 호출됩니다.
    CODEF 소득 원시 데이터는 포함하지 않고, 계산 결과만 저장합니다.
    """
    calc_id = f"calc_{uuid.uuid4().hex[:12]}"

    emp_type_map = {
        "YOUTH": EmploymentTypeEnum.YOUTH,
        "SENIOR": EmploymentTypeEnum.SENIOR,
        "NONE": EmploymentTypeEnum.NONE,
    }

    calculation = Track1Calculation(
        calculation_id=calc_id,
        user_id=user_id,
        auth_request_id=request.auth_request_id or "",
        employment_type=emp_type_map.get(request.employment_type, EmploymentTypeEnum.NONE),
        reduction_rate=Decimal(str(request.reduction_rate)),
        total_estimated_refund=request.total_estimated_refund,
        total_local_tax_refund=request.total_local_tax_refund,
        status=CalcStatusEnum.DONE,
        calculated_at=_utcnow(),
    )
    db.add(calculation)

    for yr_data in request.year_results:
        calc_case_enum: CalcCaseEnum | None = None
        if yr_data.calc_case == "SIMPLE":
            calc_case_enum = CalcCaseEnum.SIMPLE
        elif yr_data.calc_case == "COMPLEX":
            calc_case_enum = CalcCaseEnum.COMPLEX

        yr = Track1YearResult(
            calculation_id=calc_id,
            year=yr_data.year,
            annual_limit=yr_data.annual_limit,
            raw_reduction=yr_data.raw_reduction,
            reduction_amount=yr_data.reduction_amount,
            wage_credit_after=yr_data.wage_credit_after,
            corrected_final_tax=yr_data.corrected_final_tax,
            refund_income_tax=yr_data.refund_income_tax,
            refund_local_tax=yr_data.refund_local_tax,
            refund_total=yr_data.refund_total,
            calc_case=calc_case_enum,
        )
        db.add(yr)

    await db.commit()

    logger.info(
        "Result saved: calc_id=%s user=%d total_refund=%d years=%d",
        calc_id, user_id, request.total_estimated_refund, len(request.year_results),
    )

    return Track1SaveResultResponse(
        calculation_id=calc_id,
        status="SAVED",
        message="시뮬레이션 결과가 저장되었습니다.",
    )


# ═════════════════════════════════════════════════════════════════════════════
# Query helpers
# ═════════════════════════════════════════════════════════════════════════════

async def get_latest_result(
    db: AsyncSession,
    user_id: int,
) -> Track1ResultResponse:
    """사용자의 가장 최근 저장된 계산 결과 반환."""
    result = await db.execute(
        select(Track1Calculation)
        .options(selectinload(Track1Calculation.year_results))
        .where(
            Track1Calculation.user_id == user_id,
            Track1Calculation.status == CalcStatusEnum.DONE,
        )
        .order_by(Track1Calculation.created_at.desc())
        .limit(1)
    )
    calc = result.scalar_one_or_none()
    if calc is None:
        raise NotFoundException(message="저장된 계산 결과가 없습니다.")

    year_results = sorted(calc.year_results, key=lambda yr: yr.year)

    return Track1ResultResponse(
        calculation_id=calc.calculation_id,
        employment_type=calc.employment_type.value,
        reduction_rate=float(calc.reduction_rate),
        total_estimated_refund=calc.total_estimated_refund,
        total_local_tax_refund=calc.total_local_tax_refund,
        year_results=[
            Track1YearResultResponse(
                year=yr.year,
                annual_limit=yr.annual_limit,
                raw_reduction=yr.raw_reduction,
                reduction_amount=yr.reduction_amount,
                wage_credit_after=yr.wage_credit_after,
                corrected_final_tax=yr.corrected_final_tax,
                refund_income_tax=yr.refund_income_tax,
                refund_local_tax=yr.refund_local_tax,
                refund_total=yr.refund_total,
                calc_case=yr.calc_case.value if yr.calc_case else "SKIPPED",
            )
            for yr in year_results
        ],
        status=calc.status.value,
        calculated_at=calc.calculated_at,
    )


async def get_history(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[Track1HistoryItem]:
    """계산 이력 목록 (페이지네이션)."""
    count_result = await db.execute(
        select(func.count()).select_from(Track1Calculation).where(
            Track1Calculation.user_id == user_id,
        )
    )
    total: int = count_result.scalar_one()

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        select(Track1Calculation)
        .where(Track1Calculation.user_id == user_id)
        .order_by(Track1Calculation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    calculations = rows_result.scalars().all()

    items = [
        Track1HistoryItem(
            calculation_id=c.calculation_id,
            employment_type=c.employment_type.value,
            total_estimated_refund=c.total_estimated_refund,
            status=c.status.value,
            created_at=c.created_at,
        )
        for c in calculations
    ]

    total_pages = max(1, (total + page_size - 1) // page_size)

    return PaginatedResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ═════════════════════════════════════════════════════════════════════════════
# Handoff
# ═════════════════════════════════════════════════════════════════════════════

async def create_handoff(
    db: AsyncSession,
    user_id: int,
    request: HandoffRequest,
) -> HandoffResponse:
    return await handoff_service.create_handoff(db, user_id, request)


async def get_handoff(
    db: AsyncSession,
    user_id: int,
    handoff_id: str,
) -> HandoffResponse:
    return await handoff_service.get_handoff(db, user_id, handoff_id)


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

def _status_message(status: AuthProcessStatusEnum) -> str:
    messages = {
        AuthProcessStatusEnum.VERIFIED: "인증이 완료되었습니다",
        AuthProcessStatusEnum.FAILED: "인증에 실패했습니다",
        AuthProcessStatusEnum.EXPIRED: "인증 시간이 만료되었습니다",
        AuthProcessStatusEnum.WAITING_2WAY: "인증 앱에서 인증을 완료해주세요",
        AuthProcessStatusEnum.PENDING: "인증 준비 중입니다",
    }
    return messages.get(status, "")
