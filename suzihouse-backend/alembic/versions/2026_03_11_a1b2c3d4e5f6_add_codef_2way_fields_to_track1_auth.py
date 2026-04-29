"""Add CODEF 2WAY auth fields to track1_auth_requests.

Track1AuthRequest 모델에 간편인증(2WAY) 관련 컬럼 추가:
- auth_provider: 인증 수단 (kakao, toss, pass 등)
- login_type_level: CODEF loginTypeLevel 코드
- telecom: 통신사 코드 (PASS용)
- codef_session_id: CODEF id (SSO 식별값)
- two_way_jti: 2WAY jti
- two_way_timestamp: 2WAY twoWayTimestamp
- two_way_timeout_at: 2WAY 타임아웃 시각

AuthProcessStatusEnum에 WAITING_2WAY 상태 추가.

Revision ID: a1b2c3d4e5f6
Revises: 48b9bb519603
Create Date: 2026-03-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "48b9bb519603"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to track1_auth_requests
    with op.batch_alter_table("track1_auth_requests") as batch_op:
        batch_op.add_column(
            sa.Column("auth_provider", sa.String(20), nullable=True, comment="간편인증 수단 (kakao, toss, pass 등)")
        )
        batch_op.add_column(
            sa.Column("login_type_level", sa.String(10), nullable=True, comment="CODEF loginTypeLevel 코드")
        )
        batch_op.add_column(
            sa.Column("telecom", sa.String(5), nullable=True, comment="통신사 코드 (PASS용)")
        )
        batch_op.add_column(
            sa.Column("codef_session_id", sa.String(100), nullable=True, comment="CODEF id (SSO 식별값)")
        )
        batch_op.add_column(
            sa.Column("two_way_jti", sa.String(200), nullable=True, comment="2WAY jti")
        )
        batch_op.add_column(
            sa.Column("two_way_timestamp", sa.BigInteger(), nullable=True, comment="2WAY twoWayTimestamp")
        )
        batch_op.add_column(
            sa.Column("two_way_timeout_at", sa.DateTime(), nullable=True, comment="2WAY 타임아웃 시각")
        )

    # Update process_status ENUM to include WAITING_2WAY
    # MySQL ENUM modification
    op.execute(
        "ALTER TABLE track1_auth_requests "
        "MODIFY COLUMN process_status "
        "ENUM('PENDING','WAITING_2WAY','VERIFIED','FAILED','EXPIRED') "
        "NOT NULL DEFAULT 'PENDING'"
    )


def downgrade() -> None:
    # Revert process_status ENUM
    op.execute(
        "ALTER TABLE track1_auth_requests "
        "MODIFY COLUMN process_status "
        "ENUM('PENDING','VERIFIED','FAILED','EXPIRED') "
        "NOT NULL DEFAULT 'PENDING'"
    )

    # Remove added columns
    with op.batch_alter_table("track1_auth_requests") as batch_op:
        batch_op.drop_column("two_way_timeout_at")
        batch_op.drop_column("two_way_timestamp")
        batch_op.drop_column("two_way_jti")
        batch_op.drop_column("codef_session_id")
        batch_op.drop_column("telecom")
        batch_op.drop_column("login_type_level")
        batch_op.drop_column("auth_provider")
