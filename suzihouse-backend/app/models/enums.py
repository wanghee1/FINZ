"""
All Python enums used across the ORM models.

Each enum is backed by SQLAlchemy's Enum type and stored as a MySQL ENUM.
"""

import enum

__all__ = [
    "GenderEnum",
    "RoleEnum",
    "AuthProcessStatusEnum",
    "SimpleAuthProviderEnum",
    "CollectJobStatusEnum",
    "EmploymentTypeEnum",
    "IncomeDataSourceEnum",
    "CalcStatusEnum",
    "CalcCaseEnum",
    "SimulationStatusEnum",
    "TargetEnum",
    "DoneeRelationEnum",
    "TransferMethodEnum",
    "HandoffStatusEnum",
    "NotificationTypeEnum",
]


# ── User ────────────────────────────────────────────────────────────────────

class GenderEnum(str, enum.Enum):
    M = "M"
    F = "F"


class RoleEnum(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


# ── Track 1: Auth / Collect ─────────────────────────────────────────────────

class AuthProcessStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    WAITING_2WAY = "WAITING_2WAY"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class SimpleAuthProviderEnum(str, enum.Enum):
    KAKAO = "kakao"
    SAMSUNG = "samsung"
    KB = "kb"
    PASS = "pass"
    NAVER = "naver"
    SHINHAN = "shinhan"
    TOSS = "toss"
    BANKSALAD = "banksalad"
    NH = "nh"
    WOORI = "woori"


class CollectJobStatusEnum(str, enum.Enum):
    COLLECTING = "COLLECTING"
    DONE = "DONE"
    FAILED = "FAILED"


# ── Track 1: Profile / Calculation ──────────────────────────────────────────

class EmploymentTypeEnum(str, enum.Enum):
    YOUTH = "YOUTH"
    SENIOR = "SENIOR"
    NONE = "NONE"


class IncomeDataSourceEnum(str, enum.Enum):
    AUTO = "AUTO"
    MANUAL = "MANUAL"


class CalcStatusEnum(str, enum.Enum):
    CALCULATING = "CALCULATING"
    DONE = "DONE"
    FAILED = "FAILED"


class CalcCaseEnum(str, enum.Enum):
    SIMPLE = "SIMPLE"
    COMPLEX = "COMPLEX"


# ── Track 2: Simulation ────────────────────────────────────────────────────

class SimulationStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    CALCULATING = "CALCULATING"
    DONE = "DONE"
    FAILED = "FAILED"


class TargetEnum(str, enum.Enum):
    A = "A"
    B = "B"


class DoneeRelationEnum(str, enum.Enum):
    SPOUSE = "SPOUSE"
    LINEAL_DESCENDANT_ADULT = "LINEAL_DESCENDANT_ADULT"
    LINEAL_DESCENDANT_MINOR = "LINEAL_DESCENDANT_MINOR"


class TransferMethodEnum(str, enum.Enum):
    SALE = "SALE"
    GIFT = "GIFT"
    ONEROUS_GIFT = "ONEROUS_GIFT"


# ── Handoff ─────────────────────────────────────────────────────────────────

class HandoffStatusEnum(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


# ── Notification ────────────────────────────────────────────────────────────

class NotificationTypeEnum(str, enum.Enum):
    SEASON = "SEASON"
    LIFECYCLE = "LIFECYCLE"
    SYSTEM = "SYSTEM"
