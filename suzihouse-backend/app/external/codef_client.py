"""
CODEF API client – 간편인증(2WAY) + 근로소득 지급명세서 조회.

데모 버전 기준 구현.

다년도 조회 전략 (ex.js 기반):
  Step 1: paystatement-list 호출 (sessionDataYn="1") → 간편인증 2WAY 트리거
  Step 2: 2WAY 확인 → commSession 확보 (제출내역 목록 + 세션 쿠키)
  Step 3: paystatement-income에 session=commSession + inquiryType="1" + year로 연도별 조회
          → 추가 인증 불필요 (세션 재사용)

Endpoints:
- 제출내역 목록: /v1/kr/public/nt/proof-issue/paystatement-list
- 근로소득 지급명세서: /v1/kr/public/nt/proof-issue/paystatement-income
- 고용정보: /v1/kr/public/cw/kcomwel-employment/detail
"""

from __future__ import annotations

import asyncio
import json
import logging
from urllib.parse import unquote_plus

import httpx

from app.config import settings
from app.external.codef_token_manager import codef_token_manager

logger = logging.getLogger(__name__)

# CODEF API 타임아웃
_AUTH_TIMEOUT = httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=10.0)
_DATA_TIMEOUT = httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=10.0)

# Endpoints (데모 버전)
_PAYSTATEMENT_LIST_PATH = "/v1/kr/public/nt/proof-issue/paystatement-list"
_PAYSTATEMENT_INCOME_PATH = "/v1/kr/public/nt/proof-issue/paystatement-income"
_EMPLOYMENT_PATH = "/v1/kr/public/cw/kcomwel-employment/detail"

# CODEF 간편인증 loginTypeLevel 매핑
SIMPLE_AUTH_PROVIDERS = {
    "kakao": "1",
    "samsung": "3",
    "kb": "4",
    "pass": "5",
    "naver": "6",
    "shinhan": "7",
    "toss": "8",
    "banksalad": "9",
    "nh": "10",
    "woori": "11",
}


def _clean_body(body: dict) -> dict:
    """CODEF 요청 body에서 빈 문자열 값을 가진 선택적 필드를 제거.

    CODEF는 빈 문자열을 '파라미터가 존재하지만 값이 없음'으로 인식하여
    에러를 반환함. 필수 필드는 유지.
    """
    required_keys = {
        "organization", "loginType", "loginTypeLevel",
        "userName", "identity", "phoneNo", "id",
        "inquiryType", "originDataYN",
        "sessionDataYn", "session", "year",
        "companyIdentityNo",
        # 2WAY 관련
        "simpleAuth", "is2Way", "twoWayInfo",
    }
    return {
        k: v for k, v in body.items()
        if k in required_keys or v not in ("", None)
    }


class CodefClient:
    """CODEF REST API async client."""

    def __init__(self) -> None:
        self.base_url: str = settings.CODEF_BASE_URL

    # ═════════════════════════════════════════════════════════════════════════
    # Internal: HTTP call
    # ═════════════════════════════════════════════════════════════════════════

    async def _request(
        self, path: str, body: dict, *, timeout: httpx.Timeout | None = None,
    ) -> dict:
        """Send POST request to CODEF API with auth token.

        Returns FULL parsed JSON response dict (not just data).
        """
        token = await codef_token_manager.get_token()
        url = f"{self.base_url}{path}"
        req_timeout = timeout or _AUTH_TIMEOUT

        logger.info("CODEF request: %s (timeout=%.0fs)", path, req_timeout.read or 0)
        logger.info("CODEF request body: %s", {
            k: v for k, v in body.items()
            if k not in ("certFile", "keyFile", "certPassword")
        })

        async with httpx.AsyncClient(timeout=req_timeout) as client:
            resp = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

        # CODEF returns URL-encoded JSON response
        raw_text = resp.text
        logger.debug("CODEF raw response (first 500): %s", raw_text[:500])
        try:
            decoded = unquote_plus(raw_text)
            result = json.loads(decoded)
        except (json.JSONDecodeError, ValueError):
            try:
                result = resp.json()
            except Exception:
                logger.error("CODEF response parse failed. raw_text[:300]=%s", raw_text[:300])
                return {"result": {"code": "PARSE_ERROR"}, "data": {}}

        # data 필드가 문자열인 경우 이중 파싱
        data = result.get("data", {})
        if isinstance(data, str):
            logger.info("CODEF data is string, attempting JSON parse (len=%d)", len(data))
            try:
                parsed_data = json.loads(data)
                result["data"] = parsed_data
                data = parsed_data
            except (json.JSONDecodeError, ValueError):
                try:
                    parsed_data = json.loads(unquote_plus(data))
                    result["data"] = parsed_data
                    data = parsed_data
                except (json.JSONDecodeError, ValueError):
                    logger.warning("CODEF data string not parseable: %s", data[:200])

        # ── 상세 로깅 ──
        result_info = result.get("result", {})
        code = result_info.get("code", "UNKNOWN")
        message = result_info.get("message", "")

        logger.info("CODEF response: code=%s message=%s", code, message)

        # response 최상위 키 전체 로깅 (commSession 위치 파악)
        top_keys = [k for k in result.keys() if k not in ("result", "data")]
        if top_keys:
            logger.info("CODEF response top-level keys (excl result/data): %s", top_keys)
            for tk in top_keys:
                logger.info("  %s = %s", tk, repr(result[tk])[:100])

        if isinstance(data, dict):
            session_fields = {
                k: repr(v)[:100] for k, v in data.items()
                if any(s in k.lower() for s in (
                    "session", "comm", "detail", "2way", "two", "continue",
                    "job", "thread", "jti", "timestamp", "method", "extra",
                ))
            }
            if session_fields:
                logger.info("CODEF data session/auth fields: %s", session_fields)

            data_keys = list(data.keys())
            logger.info("CODEF data keys (%d): %s", len(data_keys), data_keys[:30])
        elif isinstance(data, list):
            logger.info("CODEF data is list, length=%d", len(data))
            for i, item in enumerate(data[:3]):
                if isinstance(item, dict):
                    logger.info("  data[%d] keys: %s", i, list(item.keys())[:15])
        else:
            logger.info("CODEF data type=%s value=%s", type(data).__name__, repr(data)[:200])

        # Token expired → refresh and retry once
        if code == "CF-00401":
            logger.warning("CODEF token expired, refreshing...")
            codef_token_manager.invalidate()
            token = await codef_token_manager.get_token()
            async with httpx.AsyncClient(timeout=req_timeout) as client:
                resp = await client.post(
                    url,
                    json=body,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )
            raw_text = resp.text
            try:
                result = json.loads(unquote_plus(raw_text))
            except (json.JSONDecodeError, ValueError):
                result = resp.json()

        return result

    # ═════════════════════════════════════════════════════════════════════════
    # Step 1: 지급명세서 제출내역 목록 조회 — 간편인증 2WAY 트리거 + 세션 확보
    # ═════════════════════════════════════════════════════════════════════════

    async def start_simple_auth(
        self,
        *,
        login_type_level: str,
        user_name: str,
        identity: str,
        phone_no: str,
        telecom: str = "",
        session_id: str = "",
        year: str = "",
    ) -> dict:
        """간편인증 1차 요청 — paystatement-list 호출로 세션 확보용 인증 시작.

        sessionDataYn="1"을 설정하여 응답에 commSession이 포함되도록 합니다.
        이 세션으로 이후 paystatement-income 연도별 조회 시 재인증이 불필요합니다.

        Returns parsed result dict.
        """
        # 직전 귀속연도 사용 (현재 연도는 아직 제출내역이 없음)
        # ex.js: 사용자가 지정한 시작연도 사용. 우리는 직전 완료 연도를 기본값으로 사용.
        effective_year = year or str(_current_year() - 1)

        body = {
            "organization": "0001",
            "loginType": "5",            # 간편인증
            "loginTypeLevel": login_type_level,
            "userName": user_name,
            "identity": identity,
            "phoneNo": phone_no,
            "id": session_id,
            "sessionDataYn": "1",        # 세션 데이터 포함 요청 (commSession 확보)
            "year": effective_year,
        }
        if login_type_level == "5" and telecom:
            body["telecom"] = telecom

        result = await self._request(_PAYSTATEMENT_LIST_PATH, _clean_body(body))
        return self._parse_response(result)

    async def confirm_simple_auth(
        self,
        *,
        login_type_level: str,
        user_name: str,
        identity: str,
        phone_no: str,
        telecom: str = "",
        session_id: str = "",
        year: str = "",
        two_way_info: dict,
        simple_auth: str = "1",
    ) -> dict:
        """간편인증 2차 요청 — paystatement-list에 2WAY 확인.

        사용자가 인증앱에서 인증 완료 후 호출합니다.
        성공 시 응답에 commSession이 포함되어 다년도 조회에 사용합니다.

        Returns parsed result dict.
        """
        effective_year = year or str(_current_year() - 1)

        body = {
            "organization": "0001",
            "loginType": "5",
            "loginTypeLevel": login_type_level,
            "userName": user_name,
            "identity": identity,
            "phoneNo": phone_no,
            "id": session_id,
            "sessionDataYn": "1",
            "year": effective_year,
            # 2WAY 추가 파라미터
            "simpleAuth": simple_auth,
            "is2Way": True,
            "twoWayInfo": {
                "jobIndex": two_way_info.get("jobIndex", 0),
                "threadIndex": two_way_info.get("threadIndex", 0),
                "jti": two_way_info.get("jti", ""),
                "twoWayTimestamp": two_way_info.get("twoWayTimestamp", 0),
            },
        }
        if login_type_level == "5" and telecom:
            body["telecom"] = telecom

        result = await self._request(_PAYSTATEMENT_LIST_PATH, _clean_body(body))
        return self._parse_response(result)

    # ═════════════════════════════════════════════════════════════════════════
    # Step 2: 근로소득 지급명세서 — 세션 기반 연도별 조회 (추가 인증 불필요)
    # ═════════════════════════════════════════════════════════════════════════

    async def get_paystatement_by_session(
        self,
        *,
        login_type_level: str,
        user_name: str,
        identity: str,
        phone_no: str,
        telecom: str = "",
        year: str,
        comm_session: str,
        session_id: str = "",
    ) -> dict:
        """commSession 기반 근로소득 지급명세서 연도별 조회.

        paystatement-list에서 확보한 commSession을 session 파라미터로 전달하여
        추가 인증 없이 특정 연도의 근로소득 지급명세서를 조회합니다.

        ex.js 참조: inquiryType="1", session=commSession, year=YYYY

        Returns:
            {"status": "VERIFIED"|"FAILED"|"WAITING_2WAY", "data": {...}, ...}
        """
        body = {
            "organization": "0001",
            "loginType": "5",
            "loginTypeLevel": login_type_level,
            "userName": user_name,
            "identity": identity,
            "phoneNo": phone_no,
            "inquiryType": "1",          # 특정 연도 조회
            "year": year,
            "companyIdentityNo": "",     # 빈 값 = 전체 회사
            "session": comm_session,     # 세션 재사용 (핵심!)
            "id": session_id,
            "originDataYN": "0",
        }
        if login_type_level == "5" and telecom:
            body["telecom"] = telecom

        clean = _clean_body(body)
        logger.info(
            "=== get_paystatement_by_session year=%s session=%s ===",
            year, comm_session[:30] if comm_session else "EMPTY",
        )

        # CF-00016 (중복요청) 대응: 최대 2회 재시도
        parsed = None
        for attempt in range(3):
            result = await self._request(_PAYSTATEMENT_INCOME_PATH, clean, timeout=_DATA_TIMEOUT)
            parsed = self._parse_response(result)

            if parsed["status"] == "FAILED" and parsed.get("error_code") == "CF-00016":
                wait_sec = 5 * (attempt + 1)
                logger.warning(
                    "CF-00016 duplicate request for year %s, waiting %ds (attempt %d/3)...",
                    year, wait_sec, attempt + 1,
                )
                await asyncio.sleep(wait_sec)
                continue
            break

        return parsed

    # ═════════════════════════════════════════════════════════════════════════
    # Response parsing
    # ═════════════════════════════════════════════════════════════════════════

    def _parse_response(self, result: dict) -> dict:
        """CODEF 응답을 통합된 상태 dict로 변환."""
        result_info = result.get("result", {})
        code = result_info.get("code", "")
        message = result_info.get("message", "")
        extra_message = result_info.get("extraMessage", "")
        data = result.get("data", {})

        # CF-03002: 추가인증 필요 (2WAY)
        # CF-12872: 인증 요청이 아직 완료되지 않음
        if code in ("CF-03002", "CF-12872"):
            # 2WAY 정보 추출 — data가 dict인 경우 (continue2Way 포함)
            two_way_data = data if isinstance(data, dict) else {}
            raw_jti = str(two_way_data.get("jti", "")).strip("'\"")
            return {
                "status": "WAITING_2WAY",
                "two_way_info": {
                    "jobIndex": two_way_data.get("jobIndex", 0),
                    "threadIndex": two_way_data.get("threadIndex", 0),
                    "jti": raw_jti,
                    "twoWayTimestamp": two_way_data.get("twoWayTimestamp", 0),
                },
                "extra_info": two_way_data.get("extraInfo", {}),
                "method": two_way_data.get("method", ""),
            }

        # CF-00000: 성공
        # CF-00025: 이미 응답이 완료된 요청
        if code in ("CF-00000", "CF-00025"):
            # commSession 탐색: response 최상위 → result_info → data 내부
            # CODEF는 commSession을 다양한 위치에 배치할 수 있음
            root_comm_session = result.get("commSession", "") or result_info.get("commSession", "")

            if isinstance(data, dict):
                for key in ("commSession", "commDetailParam"):
                    if key not in data and key in result:
                        data[key] = result[key]
                    if key not in data and key in result_info:
                        data[key] = result_info[key]
            elif isinstance(data, list):
                if len(data) > 0 and isinstance(data[0], dict):
                    # 첫 번째 항목에 commSession 주입
                    if "commSession" not in data[0] and root_comm_session:
                        data[0]["commSession"] = root_comm_session
                elif len(data) == 0 and root_comm_session:
                    # 빈 리스트 + 최상위에 commSession이 있는 경우
                    # → dict로 변환하여 commSession 전달
                    logger.info(
                        "CODEF data is empty list but commSession found at root: %s",
                        root_comm_session[:30],
                    )
                    data = {"commSession": root_comm_session}

            # 최상위 commSession 로깅
            if root_comm_session:
                logger.info("CODEF root commSession: %s", root_comm_session[:30])

            return {
                "status": "VERIFIED",
                "data": data,
            }

        # 기타 에러
        logger.warning(
            "CODEF error: code=%s message=%s extra=%s",
            code, message, extra_message,
        )
        return {
            "status": "FAILED",
            "error_code": code,
            "error_message": f"{message} {extra_message}".strip(),
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 근로자 고용정보현황 (공동인증서 기반 — 선택적)
    # ═════════════════════════════════════════════════════════════════════════

    async def get_employment_info(
        self,
        *,
        cert_file: str,
        key_file: str,
        cert_password_encrypted: str,
        user_type: str = "0",
        identity: str,
        manage_no: str,
        insurance_type: str = "2",
        state: str = "0",
        worker_type: str = "1",
        start_date: str = "",
        end_date: str = "",
        user_name: str = "",
    ) -> dict:
        """근로자 고용정보현황 조회."""
        body = {
            "organization": "0001",
            "loginType": "0",
            "certType": "1",
            "certFile": cert_file,
            "keyFile": key_file,
            "certPassword": cert_password_encrypted,
            "userType": user_type,
            "identity": identity,
            "manageNo": manage_no,
            "insuranceType": insurance_type,
            "state": state,
            "type": worker_type,
            "startDate": start_date,
            "endDate": end_date,
            "userName": user_name,
        }

        result = await self._request(_EMPLOYMENT_PATH, body)
        result_info = result.get("result", {})
        code = result_info.get("code", "")
        data = result.get("data", {})

        if code == "CF-00000":
            return {"status": "SUCCESS", "data": data}

        return {
            "status": "FAILED",
            "error_code": code,
            "error_message": result_info.get("message", ""),
            "data": None,
        }


def _current_year() -> int:
    """현재 연도 반환."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).year


# ── Module-level singleton ────────────────────────────────────────────────
codef_client = CodefClient()
