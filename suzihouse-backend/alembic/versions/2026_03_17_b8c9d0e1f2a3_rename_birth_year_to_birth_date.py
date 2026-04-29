"""rename birth_year to birth_date

Revision ID: b8c9d0e1f2a3
Revises: a77d19fd80b8
Create Date: 2026-03-17 10:00:00.000000+09:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = 'a77d19fd80b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check which columns already exist (handles partial migration)
    result = conn.execute(sa.text("PRAGMA table_info('users')"))
    existing_cols = {row[1] for row in result}

    # 1. Add new birth_date column if not already present
    if 'birth_date' not in existing_cols:
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(sa.Column('birth_date', sa.Date(), nullable=True))

    # 2. Migrate data: birth_year (int) -> birth_date (date, January 1st)
    if 'birth_year' in existing_cols:
        conn.execute(
            sa.text(
                "UPDATE users SET birth_date = "
                "CASE WHEN birth_year IS NOT NULL "
                "THEN DATE(birth_year || '-01-01') "
                "ELSE NULL END"
            )
        )

    # 3. Drop birth_year by recreating table (SQLite CHECK constraint
    #    referencing birth_year prevents both DROP COLUMN and batch_alter_table)
    if 'birth_year' in existing_cols:
        conn.execute(sa.text("""
            CREATE TABLE _users_new (
                id INTEGER NOT NULL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255),
                name VARCHAR(100),
                birth_date DATE,
                gender VARCHAR(1),
                phone VARCHAR(20) UNIQUE,
                stage_index SMALLINT NOT NULL DEFAULT '0',
                role VARCHAR(5) NOT NULL DEFAULT 'USER',
                is_active BOOLEAN NOT NULL DEFAULT '1',
                deleted_at DATETIME,
                created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP)
            )
        """))
        conn.execute(sa.text("""
            INSERT INTO _users_new
                (id, email, password_hash, name, birth_date, gender, phone,
                 stage_index, role, is_active, deleted_at, created_at, updated_at)
            SELECT id, email, password_hash, name, birth_date, gender, phone,
                   stage_index, role, is_active, deleted_at, created_at, updated_at
            FROM users
        """))
        conn.execute(sa.text("DROP TABLE users"))
        conn.execute(sa.text("ALTER TABLE _users_new RENAME TO users"))
        conn.execute(sa.text("CREATE UNIQUE INDEX ix_users_email ON users (email)"))


def downgrade() -> None:
    # 1. Re-add birth_year column
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('birth_year', sa.Integer(), nullable=True))

    # 2. Migrate data back: birth_date -> birth_year (extract year)
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users SET birth_year = "
            "CASE WHEN birth_date IS NOT NULL "
            "THEN YEAR(birth_date) "
            "ELSE NULL END"
        )
    )

    # 3. Drop birth_date, restore check constraint
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_check_constraint(
            'ck_users_birth_year_range',
            'birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100)',
        )
        batch_op.drop_column('birth_date')
