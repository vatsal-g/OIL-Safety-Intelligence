"""
The seven acceptance narratives from the Layer 2 specification.

These assert *concepts the text actually supports*, not a fixed argmax where
several labels are defensible: e.g. case 3 is legitimately either
`electrical_work` or `maintenance_repair`, so both are accepted.
"""

from __future__ import annotations

import pytest

from src.pipeline import analyze


def controls(result: dict) -> set[str]:
    return {c["label"] for c in result["control_deficiencies"]}


def test_case1_pressure_testing_missing_pressure_control() -> None:
    r = analyze(
        "Worker was pressurizing a well casing using temporary equipment "
        "without a pressure regulator or pressure safety valve."
    )
    assert r["action"]["label"] == "pressure_testing"
    assert r["object"]["label"] == "well_casing"
    assert "missing_pressure_control" in controls(r)
    assert r["sif"]["classification"] == "SIF_POTENTIAL"
    assert "Line of Fire" in r["iogp_rules"]


def test_case2_confined_space_no_gas_test() -> None:
    r = analyze("A worker entered a confined space without verifying that the atmosphere had been tested.")
    assert r["action"]["label"] == "confined_space"
    assert "no_gas_test" in controls(r)
    assert "Confined Space" in r["iogp_rules"]
    # "elevated SIF concern" - must not be dismissed as non-SIF.
    assert r["sif"]["classification"] != "NON_SIF_POTENTIAL"
    assert r["sif"]["score"] >= 0.5


def test_case3_electrical_panel_no_isolation() -> None:
    r = analyze(
        "A maintenance technician opened an electrical panel without isolating "
        "and locking out the power supply."
    )
    assert r["action"]["label"] in {"electrical_work", "maintenance_repair"}
    assert r["object"]["label"] == "electrical_panel"
    assert "no_isolation" in controls(r)
    assert "Energy Isolation" in r["iogp_rules"]
    assert r["sif"]["classification"] == "SIF_POTENTIAL"


def test_case4_hot_work_no_permit() -> None:
    r = analyze("A worker began welding near hydrocarbon equipment without the required work permit.")
    assert r["action"]["label"] == "hot_work"
    assert "no_permit" in controls(r)
    assert {"Hot Work", "Work Authorisation"} & set(r["iogp_rules"])


def test_case5_office_slip_is_not_automatically_sif() -> None:
    r = analyze("An employee slipped on a wet office floor while walking to the break room.")
    assert r["sif"]["classification"] != "SIF_POTENTIAL"
    assert r["sif"]["score"] < 0.5


def test_case6_line_breaking_under_pressure() -> None:
    r = analyze("A worker started removing a connection while the system was still pressurized.")
    assert r["action"]["label"] == "line_breaking"
    assert "pressure" in {e["label"] for e in r["hazardous_energies"]}
    assert controls(r), "an isolation/energy-control deficiency should be asserted"
    assert "Line of Fire" in r["iogp_rules"]


def test_case7_live_line_before_isolation() -> None:
    r = analyze("Started work on the live line before isolation was confirmed.")
    assert r["action"]["label"] in {"line_breaking", "maintenance_repair", "electrical_work"}
    assert "no_isolation" in controls(r)
    assert "Energy Isolation" in r["iogp_rules"]


@pytest.mark.parametrize(
    "text",
    [
        "Worker was pressurizing a well casing using temporary equipment "
        "without a pressure regulator or pressure safety valve.",
        "An employee slipped on a wet office floor while walking to the break room.",
    ],
)
def test_every_asserted_control_carries_evidence(text: str) -> None:
    for control in analyze(text)["control_deficiencies"]:
        assert control["evidence"], f"{control['label']} asserted with no supporting span"
