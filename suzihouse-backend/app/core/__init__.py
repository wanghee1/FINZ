"""
Core infrastructure: database, redis, security, dependencies, exceptions, middleware.
"""

from app.core.database import Base, AsyncSessionLocal, engine, get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.exceptions import (
    AppException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    RateLimitException,
    UnauthorizedException,
    register_exception_handlers,
)
from app.core.middleware import setup_middleware
from app.core.redis import RedisClient, close_redis, get_redis, init_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

__all__ = [
    # database
    "Base",
    "AsyncSessionLocal",
    "engine",
    "get_db",
    # dependencies
    "get_current_user",
    "get_current_user_optional",
    # exceptions
    "AppException",
    "BadRequestException",
    "ConflictException",
    "ForbiddenException",
    "NotFoundException",
    "RateLimitException",
    "UnauthorizedException",
    "register_exception_handlers",
    # middleware
    "setup_middleware",
    # redis
    "RedisClient",
    "close_redis",
    "get_redis",
    "init_redis",
    # security
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "hash_password",
    "verify_password",
]
