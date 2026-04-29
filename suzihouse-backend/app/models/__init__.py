"""
Central model registry.

Import every ORM model here so that:
1. Alembic's ``target_metadata = Base.metadata`` discovers all tables.
2. Other modules can do ``from app.models import User, Track1Calculation, ...``
"""

from app.models.base import Base, TimestampMixin  # noqa: F401

from app.models.enums import (  # noqa: F401
    AuthProcessStatusEnum,
    CalcCaseEnum,
    CalcStatusEnum,
    CollectJobStatusEnum,
    DoneeRelationEnum,
    EmploymentTypeEnum,
    GenderEnum,
    HandoffStatusEnum,
    IncomeDataSourceEnum,
    NotificationTypeEnum,
    RoleEnum,
    SimulationStatusEnum,
    TargetEnum,
    TransferMethodEnum,
)

from app.models.user import User  # noqa: F401
from app.models.auth import RefreshToken  # noqa: F401

from app.models.track1 import (  # noqa: F401
    Track1AuthRequest,
    Track1CollectJob,
    Track1UserProfile,
    Track1IncomeYear,
    Track1Calculation,
    Track1YearResult,
)

from app.models.track2 import (  # noqa: F401
    Track2Simulation,
    Track2Input,
    Track2RealtradeSelection,
    Track2CalcJob,
    Track2Result,
    Track2Scenario,
    Track2AiSummary,
)

from app.models.realtrade import RealtradeSyncLog, RealtradeTrade  # noqa: F401

from app.models.handoff import Handoff, HandoffEvent  # noqa: F401
from app.models.notification import UserNotification  # noqa: F401
from app.models.lifecycle import PolicyVersion, RegulatedArea  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.consent import ConsentLog  # noqa: F401

__all__ = [
    # base
    "Base",
    "TimestampMixin",
    # user / auth
    "User",
    "RefreshToken",
    # track 1
    "Track1AuthRequest",
    "Track1CollectJob",
    "Track1UserProfile",
    "Track1IncomeYear",
    "Track1Calculation",
    "Track1YearResult",
    # track 2
    "Track2Simulation",
    "Track2Input",
    "Track2RealtradeSelection",
    "Track2CalcJob",
    "Track2Result",
    "Track2Scenario",
    "Track2AiSummary",
    # handoff
    "Handoff",
    "HandoffEvent",
    # notification
    "UserNotification",
    # lifecycle / policy
    "PolicyVersion",
    "RegulatedArea",
    # realtrade cache
    "RealtradeSyncLog",
    "RealtradeTrade",
    # audit
    "AuditLog",
    # consent
    "ConsentLog",
]
