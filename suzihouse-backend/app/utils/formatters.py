"""
Korean number / date formatting utilities.

Used across Track 1 and Track 2 result rendering, PDF reports, and
any user-facing display of monetary amounts.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Union


def format_won(amount: int) -> str:
    """Format a Korean Won amount using 억 / 만 / 원 units.

    Examples
    --------
    >>> format_won(123456789)
    '1억 2,345만 6,789원'
    >>> format_won(50000)
    '5만 원'
    >>> format_won(1234)
    '1,234원'
    >>> format_won(0)
    '0원'
    >>> format_won(-250000000)
    '-2억 5,000만 원'
    """
    if amount == 0:
        return "0원"

    negative = amount < 0
    amount = abs(amount)

    eok = amount // 100_000_000           # 억
    remainder = amount % 100_000_000
    man = remainder // 10_000             # 만
    rest = remainder % 10_000             # 나머지

    parts: list[str] = []
    if eok:
        parts.append(f"{eok}억")
    if man:
        parts.append(f"{man:,}만")
    if rest:
        parts.append(f"{rest:,}원")
    elif parts:
        # When 나머지 is 0 but we have higher units, still append 원
        parts.append("원")

    result = " ".join(parts)
    if negative:
        result = "-" + result
    return result


def format_won_short(amount: int) -> str:
    """Short-form Korean Won formatting.

    Examples
    --------
    >>> format_won_short(535000000)
    '5.35억'
    >>> format_won_short(45000000)
    '4,500만'
    >>> format_won_short(3200)
    '3,200원'
    >>> format_won_short(0)
    '0원'
    >>> format_won_short(-120000000)
    '-1.2억'
    """
    if amount == 0:
        return "0원"

    negative = amount < 0
    amount = abs(amount)

    if amount >= 100_000_000:
        value = amount / 100_000_000
        # Remove unnecessary trailing zeros
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
        result = f"{text}억"
    elif amount >= 10_000:
        value = amount // 10_000
        result = f"{value:,}만"
    else:
        result = f"{amount:,}원"

    if negative:
        result = "-" + result
    return result


def format_percent(rate: float, decimals: int = 1) -> str:
    """Format a decimal rate as a percentage string.

    Examples
    --------
    >>> format_percent(0.42)
    '42.0%'
    >>> format_percent(0.035, decimals=2)
    '3.50%'
    >>> format_percent(1.0, decimals=0)
    '100%'
    """
    pct = rate * 100
    return f"{pct:.{decimals}f}%"


def format_date_kr(d: Union[date, datetime, str]) -> str:
    """Format a date in Korean style: ``YYYY년 M월 D일``.

    Accepts ``datetime.date``, ``datetime.datetime``, or an ISO-format string.

    Examples
    --------
    >>> from datetime import date
    >>> format_date_kr(date(2024, 1, 15))
    '2024년 1월 15일'
    >>> format_date_kr("2023-12-03")
    '2023년 12월 3일'
    """
    if isinstance(d, str):
        d = date.fromisoformat(d)
    if isinstance(d, datetime):
        d = d.date()
    return f"{d.year}년 {d.month}월 {d.day}일"
