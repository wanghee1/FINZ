"""
Role-Based Access Control (RBAC) dependency factory.

Usage::

    from app.core.rbac import require_role
    from app.models.enums import RoleEnum

    @router.get("/admin/users", dependencies=[Depends(require_role(RoleEnum.ADMIN))])
    async def list_users(): ...
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_active_user
from app.models.enums import RoleEnum
from app.models.user import User


def require_role(*allowed_roles: RoleEnum):
    """Return a FastAPI dependency that enforces role-based access.

    Parameters
    ----------
    *allowed_roles : RoleEnum
        One or more roles that are permitted to access the endpoint.
    """

    async def _check_role(
        user: User = Depends(get_current_active_user),
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 기능에 대한 접근 권한이 없습니다",
            )
        return user

    return _check_role
