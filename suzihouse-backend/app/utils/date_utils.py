"""
Date arithmetic helpers for Korean tax calculations.

Provides year / month differences, leap-year-safe date addition,
tax-year range generation, and rectification-period checks.
"""

from __future__ import annotations

from datetime import date, timedelta


def years_between(start: date, end: date) -> int:
    """Return the number of **full** years between *start* and *end*.

    A full year has elapsed when the anniversary date has passed.

    Examples
    --------
    >>> from datetime import date
    >>> years_between(date(2000, 3, 15), date(2005, 3, 14))
    4
    >>> years_between(date(2000, 3, 15), date(2005, 3, 15))
    5
    """
    if end < start:
        return -years_between(end, start)

    diff = end.year - start.year
    # Subtract 1 if the anniversary hasn't occurred yet in the end year
    if (end.month, end.day) < (start.month, start.day):
        diff -= 1
    return diff


def months_between(start: date, end: date) -> int:
    """Return the number of **full** months between *start* and *end*.

    Examples
    --------
    >>> from datetime import date
    >>> months_between(date(2024, 1, 15), date(2024, 4, 14))
    2
    >>> months_between(date(2024, 1, 15), date(2024, 4, 15))
    3
    """
    if end < start:
        return -months_between(end, start)

    diff = (end.year - start.year) * 12 + (end.month - start.month)
    if end.day < start.day:
        diff -= 1
    return diff


def add_years(d: date, years: int) -> date:
    """Add *years* to *d*, handling Feb 29 gracefully.

    If *d* is Feb 29 and the target year is not a leap year, the result
    is Feb 28.

    Examples
    --------
    >>> from datetime import date
    >>> add_years(date(2020, 2, 29), 1)
    datetime.date(2021, 2, 28)
    >>> add_years(date(2020, 2, 29), 4)
    datetime.date(2024, 2, 29)
    >>> add_years(date(2023, 6, 15), 2)
    datetime.date(2025, 6, 15)
    """
    target_year = d.year + years
    try:
        return d.replace(year=target_year)
    except ValueError:
        # Feb 29 in a non-leap year -> Feb 28
        return d.replace(year=target_year, day=28)


def get_tax_year_range(year: int) -> tuple[date, date]:
    """Return the inclusive date range ``(Jan 1, Dec 31)`` for *year*.

    Examples
    --------
    >>> get_tax_year_range(2024)
    (datetime.date(2024, 1, 1), datetime.date(2024, 12, 31))
    """
    return date(year, 1, 1), date(year, 12, 31)


def is_within_rectification_period(
    year: int,
    current_year: int = 2026,
) -> bool:
    """Check whether a rectification claim (경정청구) can still be filed
    for the given tax *year*.

    Under Korean tax law the filing deadline for a tax year is the end of
    the following March, and a rectification request can be made within
    **5 years** of that deadline.

    Parameters
    ----------
    year : int
        The tax year in question.
    current_year : int
        The current calendar year (defaults to 2026).

    Returns
    -------
    bool
        ``True`` if the rectification period has **not** expired.

    Examples
    --------
    >>> is_within_rectification_period(2020, current_year=2026)
    True
    >>> is_within_rectification_period(2019, current_year=2026)
    False
    """
    # The filing deadline for 'year' is March 31 of year+1.
    # Rectification is allowed for 5 years after the deadline,
    # i.e. until March 31 of year+6.
    deadline_year = year + 1  # Original filing deadline year
    rectification_expires_year = deadline_year + 5  # 5 years from deadline
    return current_year <= rectification_expires_year
