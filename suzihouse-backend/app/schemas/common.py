"""
Common response schemas shared across all API endpoints.

Provides:
- ApiResponse      – Standard success wrapper
- ErrorResponse    – Standard error wrapper
- PaginatedResponse – Paginated list wrapper
"""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API success response wrapper."""

    status: str = "success"
    data: Optional[T] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard API error response."""

    status: str = "error"
    code: str
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response with metadata."""

    status: str = "success"
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
