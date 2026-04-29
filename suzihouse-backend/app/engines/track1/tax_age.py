"""
Track 1 - Age and military service calculations for tax eligibility.

Computes:
  - 만 나이 (full-years age)
  - 복무기간 (military service duration in months)
  - 세법상 나이 (tax-law age, with military deduction for males)
  - Whether a military service certificate is required
"""

from datetime import date

from app.engines.common.constants import MAX_MILITARY_DEDUCTION_MONTHS


def calc_age(birth_date: date, reference_date: date) -> int:
    """
    Calculate 만 나이 (Korean full-years age) as of a reference date.

    The age is the number of full years since birth. If the birthday has not
    yet occurred in the reference year, one year is subtracted.

    Args:
        birth_date: Date of birth.
        reference_date: The date to calculate age as of.

    Returns:
        Age in full years (int, >= 0).
    """
    age = reference_date.year - birth_date.year
    if (reference_date.month, reference_date.day) < (birth_date.month, birth_date.day):
        age -= 1
    return max(age, 0)


def calc_military_months(enlist_date: date, discharge_date: date) -> int:
    """
    Calculate military service duration in months.

    Capped at MAX_MILITARY_DEDUCTION_MONTHS (72 months / 6 years).

    Args:
        enlist_date: Date of enlistment (입대일).
        discharge_date: Date of discharge (전역일).

    Returns:
        Number of months served, capped at 72. Returns 0 if discharge is before enlist.
    """
    if discharge_date < enlist_date:
        return 0
    months = (discharge_date.year - enlist_date.year) * 12 + (
        discharge_date.month - enlist_date.month
    )
    return min(max(months, 0), MAX_MILITARY_DEDUCTION_MONTHS)


def calc_tax_age(
    birth_date: date,
    hire_date: date,
    military_months: int,
    gender: str,
) -> float:
    """
    Calculate 세법상 나이 (tax-law age).

    For males with military service, the tax age is reduced by the service
    duration converted to years (months / 12).

    Args:
        birth_date: Date of birth.
        hire_date: Date of first SME employment (중소기업 최초취업일).
        military_months: Military service duration in months (0 for females or non-served).
        gender: "M" for male, "F" for female.

    Returns:
        Tax-law age as a float. For females or zero military months, this is
        the integer age as a float.
    """
    age = calc_age(birth_date, hire_date)
    if gender == "M" and military_months > 0:
        return age - (military_months / 12.0)
    return float(age)


def needs_military_doc(birth_date: date, hire_date: date, gender: str) -> bool:
    """
    Determine whether a military service certificate (병적증명서) is required.

    Only males aged 35-40 (만 나이) at the time of hiring need to provide
    the document, as their eligibility may depend on military service deduction
    to bring the tax age within the youth threshold (34세 이하).

    Args:
        birth_date: Date of birth.
        hire_date: Date of first SME employment.
        gender: "M" for male, "F" for female.

    Returns:
        True if a military service certificate is required.
    """
    if gender != "M":
        return False
    age = calc_age(birth_date, hire_date)
    return 35 <= age <= 40
