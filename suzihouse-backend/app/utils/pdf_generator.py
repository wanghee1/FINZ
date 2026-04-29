"""
PDF report generation stubs for Track 1 and Track 2.

These functions produce simple placeholder PDFs using *reportlab*.
They will be expanded with full branding and detailed tables once the
design is finalised.
"""

from __future__ import annotations

from io import BytesIO


def generate_track1_report(calculation_data: dict) -> BytesIO:
    """Generate a Track 1 (Youth Income Tax Refund) report PDF.

    Parameters
    ----------
    calculation_data : dict
        Must contain at least ``calculation_id`` and
        ``total_estimated_refund``.  Year-level details are optional.

    Returns
    -------
    BytesIO
        A seeked-to-zero buffer containing the PDF bytes.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # ── Title ─────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 18)
    c.drawString(100, height - 80, "FINZ - Tax Refund Report")

    # ── Summary info ──────────────────────────────────────────────────────
    c.setFont("Helvetica", 12)
    y = height - 130

    calc_id = calculation_data.get("calculation_id", "N/A")
    c.drawString(100, y, f"Calculation ID: {calc_id}")
    y -= 25

    total_refund = calculation_data.get("total_estimated_refund", 0)
    c.drawString(100, y, f"Total Estimated Refund: {total_refund:,} won")
    y -= 25

    total_local = calculation_data.get("total_local_tax_refund", 0)
    c.drawString(100, y, f"Total Local Tax Refund: {total_local:,} won")
    y -= 25

    emp_type = calculation_data.get("employment_type", "N/A")
    c.drawString(100, y, f"Employment Type: {emp_type}")
    y -= 40

    # ── Per-year results (if present) ────────────────────────────────────
    year_results = calculation_data.get("year_results", [])
    if year_results:
        c.setFont("Helvetica-Bold", 13)
        c.drawString(100, y, "Year-by-Year Breakdown")
        y -= 25

        c.setFont("Helvetica", 10)
        for yr in year_results:
            year = yr.get("year", "?")
            refund = yr.get("refund_total", 0)
            case = yr.get("calc_case", "N/A")
            c.drawString(
                120, y,
                f"{year}:  refund = {refund:,} won  (case: {case})",
            )
            y -= 18
            if y < 80:
                c.showPage()
                y = height - 80

    # ── Footer ────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        100, 40,
        "This is a preliminary estimate and does not constitute tax advice.",
    )

    c.save()
    buffer.seek(0)
    return buffer


def generate_track2_report(simulation_data: dict) -> BytesIO:
    """Generate a Track 2 (6-Way Tax Comparison) report PDF.

    Parameters
    ----------
    simulation_data : dict
        Should contain simulation metadata and scenario results.

    Returns
    -------
    BytesIO
        A seeked-to-zero buffer containing the PDF bytes.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # ── Title ─────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 18)
    c.drawString(100, height - 80, "FINZ - 6Way Tax Comparison Report")

    # ── Summary info ──────────────────────────────────────────────────────
    c.setFont("Helvetica", 12)
    y = height - 130

    sim_id = simulation_data.get("simulation_id", "N/A")
    c.drawString(100, y, f"Simulation ID: {sim_id}")
    y -= 25

    status_val = simulation_data.get("status", "N/A")
    c.drawString(100, y, f"Status: {status_val}")
    y -= 40

    # ── Scenario results (if present) ────────────────────────────────────
    scenarios = simulation_data.get("scenarios", [])
    if scenarios:
        c.setFont("Helvetica-Bold", 13)
        c.drawString(100, y, "Scenario Comparison")
        y -= 25

        c.setFont("Helvetica", 10)
        for sc in scenarios:
            method = sc.get("method", "?")
            total_tax = sc.get("total_tax", 0)
            c.drawString(
                120, y,
                f"{method}:  total tax = {total_tax:,} won",
            )
            y -= 18
            if y < 80:
                c.showPage()
                y = height - 80

    # ── Footer ────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        100, 40,
        "This is a preliminary estimate and does not constitute tax advice.",
    )

    c.save()
    buffer.seek(0)
    return buffer
