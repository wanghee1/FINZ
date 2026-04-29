"""
Data retention and GDPR-style deletion service.

개인정보보호법 §21: 개인정보 파기 의무.
- 이용 목적 달성 후 지체 없이 파기
- 탈퇴 회원: 30일 유예 후 PII 파기 (복구 요청 대응)
- 감사 로그: 5년 보관 후 파기
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.auth import RefreshToken
from app.models.handoff import Handoff
from app.models.track1 import Track1AuthRequest, Track1UserProfile
from app.models.user import User

logger = logging.getLogger(__name__)

# Soft-deleted accounts are purged after this many days
ACCOUNT_RETENTION_DAYS = 30

# Audit logs are retained for 5 years (개인정보보호법)
AUDIT_RETENTION_YEARS = 5


async def purge_expired_accounts(db: AsyncSession) -> int:
    """Hard-delete PII for accounts soft-deleted more than 30 days ago.

    This anonymizes user data rather than fully deleting records,
    preserving referential integrity for audit trails.

    Returns the number of accounts purged.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=ACCOUNT_RETENTION_DAYS)

    result = await db.execute(
        select(User).where(
            User.deleted_at.isnot(None),
            User.deleted_at < cutoff,
            User.email.notlike("deleted_%@purged.local"),
        )
    )
    users = result.scalars().all()

    count = 0
    for user in users:
        # Anonymize PII fields
        user.email = f"deleted_{user.id}@purged.local"
        user.password_hash = None
        user.name = None
        user.phone = None
        user.birth_date = None
        user.gender = None

        count += 1

    # Also anonymize handoff PII for these users
    user_ids = [u.id for u in users]
    if user_ids:
        await db.execute(
            update(Handoff)
            .where(Handoff.user_id.in_(user_ids))
            .values(
                contact_name="[삭제됨]",
                contact_phone="[삭제됨]",
                contact_email=None,
                memo=None,
            )
        )

        # Anonymize Track1AuthRequest PII
        await db.execute(
            update(Track1AuthRequest)
            .where(Track1AuthRequest.user_id.in_(user_ids))
            .values(
                user_name=None,
                user_birth=None,
                user_mobile=None,
            )
        )

    if count > 0:
        logger.info("Purged PII for %d expired accounts", count)

    return count


async def purge_expired_audit_logs(db: AsyncSession) -> int:
    """Delete audit logs older than 5 years.

    개인정보보호법 requires 5-year retention of access logs.
    After that period, they should be purged.

    Returns the number of logs deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=AUDIT_RETENTION_YEARS * 365)

    result = await db.execute(
        delete(AuditLog).where(AuditLog.created_at < cutoff)
    )

    count = result.rowcount
    if count > 0:
        logger.info("Purged %d audit logs older than %d years", count, AUDIT_RETENTION_YEARS)

    return count


async def purge_expired_refresh_tokens(db: AsyncSession) -> int:
    """Delete revoked or expired refresh tokens older than 7 days.

    Keeps the refresh_tokens table from growing unboundedly.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        delete(RefreshToken).where(
            (RefreshToken.revoked_at.isnot(None) & (RefreshToken.revoked_at < cutoff))
            | (RefreshToken.expires_at < cutoff)
        )
    )

    count = result.rowcount
    if count > 0:
        logger.info("Purged %d expired/revoked refresh tokens", count)

    return count
