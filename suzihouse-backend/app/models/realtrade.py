"""
Real-trade cache models — 국토교통부 아파트 실거래가 캐시 DB.

API를 주기적으로 호출하여 DB에 저장하고,
사용자 요청 시에는 DB에서 직접 조회하여 응답합니다.

Tables:
- realtrade_sync_logs   : 동기화 이력 (지역/월별 sync 상태)
- realtrade_trades      : 개별 거래 레코드 캐시
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt, TimestampMixin


class RealtradeSyncLog(TimestampMixin, Base):
    """동기화 이력 — 어느 지역/월의 데이터를 언제 가져왔는지 추적."""

    __tablename__ = "realtrade_sync_logs"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)

    lawd_cd: Mapped[str] = mapped_column(String(5), nullable=False, comment="법정동코드 5자리")
    deal_ymd: Mapped[str] = mapped_column(String(6), nullable=False, comment="거래년월 YYYYMM")

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="SUCCESS",
        comment="SUCCESS / FAILED / IN_PROGRESS",
    )
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="수집된 건수")
    synced_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
        comment="동기화 완료 시각",
    )
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        Index("ix_sync_lawd_ymd", "lawd_cd", "deal_ymd", unique=True),
    )


class RealtradeTrade(TimestampMixin, Base):
    """개별 아파트 실거래 레코드 캐시."""

    __tablename__ = "realtrade_trades"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)

    # ── 위치 ────────────────────────────────────
    lawd_cd: Mapped[str] = mapped_column(String(5), nullable=False, comment="법정동코드 5자리")
    sgg_cd: Mapped[str] = mapped_column(String(5), nullable=False, default="", comment="시군구코드")
    umd_cd: Mapped[str] = mapped_column(String(5), nullable=False, default="", comment="읍면동코드")
    umd_nm: Mapped[str] = mapped_column(String(50), nullable=False, default="", comment="법정동명")
    jibun: Mapped[str] = mapped_column(String(20), nullable=False, default="", comment="지번")
    road_nm: Mapped[str] = mapped_column(String(100), nullable=False, default="", comment="도로명")

    # ── 아파트 ──────────────────────────────────
    apt_nm: Mapped[str] = mapped_column(String(100), nullable=False, comment="아파트명")
    apt_seq: Mapped[str] = mapped_column(String(30), nullable=False, default="", comment="단지일련번호")
    apt_dong: Mapped[str] = mapped_column(String(20), nullable=False, default="", comment="동")
    build_year: Mapped[str] = mapped_column(String(4), nullable=False, default="", comment="건축년도")

    # ── 거래 ────────────────────────────────────
    deal_year: Mapped[str] = mapped_column(String(4), nullable=False, comment="거래년도")
    deal_month: Mapped[str] = mapped_column(String(2), nullable=False, comment="거래월")
    deal_day: Mapped[str] = mapped_column(String(2), nullable=False, comment="거래일")
    deal_ymd: Mapped[str] = mapped_column(String(6), nullable=False, comment="거래년월 YYYYMM (파티션키)")
    deal_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="거래금액 (만원)")

    # ── 면적/층 ─────────────────────────────────
    exclu_use_ar: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, comment="전용면적 ㎡")
    floor: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="층")

    # ── 기타 ────────────────────────────────────
    cdeal_type: Mapped[str] = mapped_column(String(10), nullable=False, default="", comment="해제여부")
    cdeal_day: Mapped[str] = mapped_column(String(10), nullable=False, default="", comment="해제사유발생일")
    dealing_gbn: Mapped[str] = mapped_column(String(20), nullable=False, default="", comment="거래유형")
    sler_gbn: Mapped[str] = mapped_column(String(20), nullable=False, default="", comment="매도자")
    buyer_gbn: Mapped[str] = mapped_column(String(20), nullable=False, default="", comment="매수자")
    land_lease_hold_gbn: Mapped[str] = mapped_column(String(5), nullable=False, default="", comment="토지임대부")
    rgst_date: Mapped[str] = mapped_column(String(10), nullable=False, default="", comment="등기일자")
    estate_agent_sgg_nm: Mapped[str] = mapped_column(String(100), nullable=False, default="", comment="중개사소재지")

    __table_args__ = (
        # 핵심 조회 인덱스
        Index("ix_trade_lawd_ymd", "lawd_cd", "deal_ymd"),
        Index("ix_trade_apt_nm", "apt_nm"),
        Index("ix_trade_lawd_apt", "lawd_cd", "apt_nm"),
    )
