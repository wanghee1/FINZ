"""initial schema with security constraints

Revision ID: 6f7e3227af53
Revises: 
Create Date: 2026-03-09 16:32:33.023862+09:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f7e3227af53'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('handoffs', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_handoffs_calculation_id', 'track1_calculations', ['calculation_id'], ['calculation_id'], ondelete='SET NULL')

    with op.batch_alter_table('refresh_tokens', schema=None) as batch_op:
        batch_op.create_index('ix_refresh_tokens_user_revoked', ['user_id', 'revoked_at'], unique=False)

    with op.batch_alter_table('regulated_areas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_regulated_areas_region_code'))
        batch_op.create_index(batch_op.f('ix_regulated_areas_region_code'), ['region_code'], unique=True)

    with op.batch_alter_table('track1_auth_requests', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_track1_auth_requests_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('track1_calculations', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_track1_calculations_auth_request_id', 'track1_auth_requests', ['auth_request_id'], ['auth_request_id'], ondelete='SET NULL')

    with op.batch_alter_table('track1_collect_jobs', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_track1_collect_jobs_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_track1_collect_jobs_auth_request_id', 'track1_auth_requests', ['auth_request_id'], ['auth_request_id'], ondelete='SET NULL')

    with op.batch_alter_table('track1_income_years', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_track1_income_years_user_year', ['user_id', 'year'])
        batch_op.create_foreign_key('fk_track1_income_years_calculation_id', 'track1_calculations', ['calculation_id'], ['calculation_id'], ondelete='SET NULL')

    with op.batch_alter_table('track2_inputs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))

    with op.batch_alter_table('track2_results', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_track2_results_job_id', 'track2_calc_jobs', ['job_id'], ['job_id'], ondelete='SET NULL')

    with op.batch_alter_table('track2_simulations', schema=None) as batch_op:
        batch_op.create_index('ix_track2_simulations_user_created', ['user_id', 'created_at'], unique=False)

    with op.batch_alter_table('user_notifications', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_user_notifications_user_type', ['user_id', 'type'])

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_users_phone', ['phone'])


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_phone', type_='unique')

    with op.batch_alter_table('user_notifications', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_notifications_user_type', type_='unique')

    with op.batch_alter_table('track2_simulations', schema=None) as batch_op:
        batch_op.drop_index('ix_track2_simulations_user_created')

    with op.batch_alter_table('track2_results', schema=None) as batch_op:
        batch_op.drop_constraint('fk_track2_results_job_id', type_='foreignkey')

    with op.batch_alter_table('track2_inputs', schema=None) as batch_op:
        batch_op.drop_column('created_at')

    with op.batch_alter_table('track1_income_years', schema=None) as batch_op:
        batch_op.drop_constraint('fk_track1_income_years_calculation_id', type_='foreignkey')
        batch_op.drop_constraint('uq_track1_income_years_user_year', type_='unique')

    with op.batch_alter_table('track1_collect_jobs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_track1_collect_jobs_auth_request_id', type_='foreignkey')
        batch_op.drop_constraint('fk_track1_collect_jobs_user_id', type_='foreignkey')

    with op.batch_alter_table('track1_calculations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_track1_calculations_auth_request_id', type_='foreignkey')

    with op.batch_alter_table('track1_auth_requests', schema=None) as batch_op:
        batch_op.drop_constraint('fk_track1_auth_requests_user_id', type_='foreignkey')

    with op.batch_alter_table('regulated_areas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_regulated_areas_region_code'))
        batch_op.create_index(batch_op.f('ix_regulated_areas_region_code'), ['region_code'], unique=False)

    with op.batch_alter_table('refresh_tokens', schema=None) as batch_op:
        batch_op.drop_index('ix_refresh_tokens_user_revoked')

    with op.batch_alter_table('handoffs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_handoffs_calculation_id', type_='foreignkey')
