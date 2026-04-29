"""
Tests for database model constraints and schema integrity.
"""

import pytest
from sqlalchemy import inspect

from app.core.database import Base


class TestModelConstraints:
    """Verify that ORM models have expected security constraints."""

    @pytest.fixture(autouse=True)
    def _load_models(self):
        import app.models  # noqa: F401

    def _get_table(self, name: str):
        return Base.metadata.tables.get(name)

    def test_users_table_exists(self):
        assert self._get_table("users") is not None

    def test_users_email_unique(self):
        table = self._get_table("users")
        email_col = table.c.email
        # Check column-level unique or index-level unique
        assert email_col.unique or any(
            idx.unique and "email" in [c.name for c in idx.columns]
            for idx in table.indexes
        )

    def test_users_phone_unique(self):
        table = self._get_table("users")
        phone_col = table.c.phone
        assert phone_col.unique or any(
            idx.unique and "phone" in [c.name for c in idx.columns]
            for idx in table.indexes
        )

    def test_refresh_token_hash_unique(self):
        table = self._get_table("refresh_tokens")
        assert table.c.token_hash.unique

    def test_refresh_token_user_fk(self):
        table = self._get_table("refresh_tokens")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "users.id" in fks

    def test_track1_auth_requests_user_fk(self):
        table = self._get_table("track1_auth_requests")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "users.id" in fks

    def test_track1_collect_jobs_fks(self):
        table = self._get_table("track1_collect_jobs")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "users.id" in fks
        assert "track1_auth_requests.auth_request_id" in fks

    def test_track1_income_years_unique_user_year(self):
        table = self._get_table("track1_income_years")
        unique_constraints = [
            c for c in table.constraints
            if hasattr(c, "columns") and len(c.columns) > 1
        ]
        user_year_uq = any(
            set(col.name for col in c.columns) == {"user_id", "year"}
            for c in unique_constraints
        )
        assert user_year_uq

    def test_handoffs_calculation_fk(self):
        table = self._get_table("handoffs")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "track1_calculations.calculation_id" in fks

    def test_track2_results_job_fk(self):
        table = self._get_table("track2_results")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "track2_calc_jobs.job_id" in fks

    def test_audit_logs_user_fk(self):
        table = self._get_table("audit_logs")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "users.id" in fks

    def test_consent_logs_table_exists(self):
        assert self._get_table("consent_logs") is not None

    def test_consent_logs_user_fk(self):
        table = self._get_table("consent_logs")
        fks = [fk.target_fullname for fk in table.foreign_keys]
        assert "users.id" in fks

    def test_user_notifications_unique_user_type(self):
        table = self._get_table("user_notifications")
        unique_constraints = [
            c for c in table.constraints
            if hasattr(c, "columns") and len(c.columns) > 1
        ]
        user_type_uq = any(
            set(col.name for col in c.columns) == {"user_id", "type"}
            for c in unique_constraints
        )
        assert user_type_uq

    def test_composite_indexes_exist(self):
        """Verify that performance-critical composite indexes are defined."""
        rt_table = self._get_table("refresh_tokens")
        rt_indexes = {idx.name for idx in rt_table.indexes}
        assert "ix_refresh_tokens_user_revoked" in rt_indexes

        audit_table = self._get_table("audit_logs")
        audit_indexes = {idx.name for idx in audit_table.indexes}
        assert "ix_audit_logs_event_created" in audit_indexes

        sim_table = self._get_table("track2_simulations")
        sim_indexes = {idx.name for idx in sim_table.indexes}
        assert "ix_track2_simulations_user_created" in sim_indexes

    def test_regulated_areas_region_code_unique(self):
        table = self._get_table("regulated_areas")
        assert table.c.region_code.unique
