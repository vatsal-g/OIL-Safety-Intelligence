"""
Robustness: the service is fed real incident-report prose, which is noisy.

Each test below encodes an input-degradation the spec calls out. The bar is
*stability*, not perfection: casing, whitespace, common typos and standard
industry abbreviations must not change the conclusion.
"""

from __future__ import annotations

import pytest

from src.pipeline import analyze

BASE = "A maintenance technician opened an electrical panel without isolating and locking out the power supply."


def labels(text: str) -> set[str]:
    return {c["label"] for c in analyze(text)["control_deficiencies"]}


@pytest.mark.parametrize(
    "variant",
    [
        BASE.lower(),
        BASE.upper(),
        "  A   maintenance technician   opened an electrical panel\twithout isolating\nand locking out the power supply.  ",
        "A maintenence techncian opend an eletrical panel without isolating and lockout the power suply.",
    ],
)
def test_casing_whitespace_and_typos_preserve_no_isolation(variant: str) -> None:
    assert "no_isolation" in labels(variant)


@pytest.mark.parametrize(
    "text",
    [
        "Technician worked on the panel without LOTO applied.",
        "Crew began hot work with no PTW in place.",
        "Entered the vessel without CSE certificate or gas test.",
    ],
)
def test_abbreviations_are_expanded(text: str) -> None:
    assert labels(text), f"abbreviation not expanded into a control deficiency: {text!r}"


def test_indirect_wording_still_detected() -> None:
    # No "without" anywhere - the cue is "had not yet been".
    result = analyze("The line was opened although the isolation had not yet been confirmed by the operator.")
    assert "no_isolation" in {c["label"] for c in result["control_deficiencies"]}


def test_explicit_negation_forms() -> None:
    for text in (
        "No gas test was carried out before entry into the tank.",
        "The crew did not obtain a work permit before starting to weld.",
        "Guards were removed from the rotating equipment.",
    ):
        assert labels(text), text


def test_presence_of_control_is_not_a_deficiency() -> None:
    result = analyze(
        "The equipment was isolated, locked out and tagged out, a gas test was completed "
        "and a valid work permit was in place before the work started."
    )
    assert not result["control_deficiencies"]


def test_very_short_report_abstains() -> None:
    result = analyze("Slipped.")
    assert result["action"]["label"] == "unknown"
    assert result["sif"]["classification"] == "UNCERTAIN"
    assert result["sif"]["abstained"] is True


def test_irrelevant_report_asserts_nothing() -> None:
    result = analyze("The quarterly stationery order was delivered to the third floor office reception.")
    assert not result["control_deficiencies"]
    assert result["sif"]["classification"] != "SIF_POTENTIAL"


def test_contradictory_phrases_do_not_crash_and_stay_bounded() -> None:
    result = analyze(
        "The system was isolated but was still pressurized when the flange was opened; "
        "isolation was later found not to have been applied."
    )
    assert 0.0 <= result["sif"]["score"] <= 1.0
    for control in result["control_deficiencies"]:
        assert control["evidence"]


def test_missing_and_blank_fields() -> None:
    for text in ("", "   ", "n/a"):
        result = analyze(text)
        assert result["sif"]["classification"] == "UNCERTAIN"
        assert not result["control_deficiencies"]
