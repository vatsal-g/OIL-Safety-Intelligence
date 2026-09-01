"""
Safety invariants. These are the tests that must never be relaxed.

The core promise of Layer 2 is that a control deficiency is only ever asserted
when the report text contains a span supporting it. A statistical model may
*suggest* a deficiency for human review, but a suggestion has to arrive in a
separate field, marked uncertain, with no evidence attached.
"""

from __future__ import annotations

import json

from src import taxonomy as TX
from src.pipeline import analyze

SAMPLES = [
    "Worker was pressurizing a well casing using temporary equipment without a pressure regulator.",
    "An employee slipped on a wet office floor while walking to the break room.",
    "A worker fell from the third level of the scaffold while dismantling handrails.",
    "Operator was struck by a suspended load that swung when the sling failed.",
    "Employee inhaled hydrogen sulphide while taking a sample from the sump.",
    "",
]


def test_no_control_deficiency_without_evidence_span() -> None:
    for text in SAMPLES:
        for control in analyze(text)["control_deficiencies"]:
            assert control["evidence"], f"{control['label']} asserted without evidence on {text!r}"
            assert control["spans"], f"{control['label']} has no character span on {text!r}"


def test_evidence_spans_are_real_substrings_of_the_prepared_text() -> None:
    """Evidence must be quoted from the text, never generated."""
    for text in SAMPLES:
        result = analyze(text)
        prepared = result["text_prepared"]
        for control in result["control_deficiencies"]:
            for start, end in control["spans"]:
                assert 0 <= start < end <= len(prepared)


def test_model_only_control_suggestions_are_quarantined() -> None:
    for text in SAMPLES:
        result = analyze(text)
        asserted = {c["label"] for c in result["control_deficiencies"]}
        for candidate in result["uncertain_control_candidates"]:
            assert candidate["status"] == "uncertain_no_textual_evidence"
            assert not candidate["evidence"]
            assert candidate["label"] not in asserted


def test_only_taxonomy_values_are_emitted() -> None:
    for text in SAMPLES:
        result = analyze(text)
        assert result["action"]["label"] in TX.ACTIONS
        assert result["object"]["label"] in TX.OBJECTS
        for control in result["control_deficiencies"]:
            assert control["label"] in TX.CONTROL_DEFICIENCIES
        for rule in result["iogp_rules"]:
            assert rule in TX.IOGP_RULES


def test_response_is_pure_json_types() -> None:
    """No np.float64 / np.str_ may reach the API layer."""
    for text in SAMPLES:
        payload = analyze(text, report_id="R-1")
        encoded = json.dumps(payload)  # raises TypeError on numpy scalars
        assert json.loads(encoded) == payload

        def walk(node: object) -> None:
            if isinstance(node, dict):
                for key, value in node.items():
                    assert type(key) is str
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)
            else:
                assert node is None or type(node) in (str, int, float, bool), type(node)

        walk(payload)


def test_sif_score_is_bounded_and_classification_is_valid() -> None:
    for text in SAMPLES:
        sif = analyze(text)["sif"]
        assert 0.0 <= sif["score"] <= 1.0
        assert sif["classification"] in {"SIF_POTENTIAL", "NON_SIF_POTENTIAL", "UNCERTAIN"}
        if sif["classification"] == "UNCERTAIN":
            assert sif["abstained"] is True


def test_confidences_are_bounded() -> None:
    for text in SAMPLES:
        result = analyze(text)
        for slot in ("action", "object"):
            assert 0.0 <= result[slot]["confidence"] <= 1.0
        for control in result["control_deficiencies"]:
            assert 0.0 <= control["confidence"] <= 1.0


def test_unknown_slot_has_no_evidence() -> None:
    result = analyze("The quarterly stationery order was delivered to reception.")
    if result["action"]["label"] == TX.UNKNOWN:
        assert not result["action"]["evidence"]


def test_layer1_metadata_is_echoed_not_trusted() -> None:
    """Layer 1 context may be attached later; it must not alter the inference."""
    text = "A worker began welding near hydrocarbon equipment without the required work permit."
    plain = analyze(text)
    with_layer1 = analyze(text, layer1={"site": "Rig 4", "reported_by": "supervisor"})
    assert with_layer1["meta"]["layer1_context"] == {"site": "Rig 4", "reported_by": "supervisor"}
    assert with_layer1["action"] == plain["action"]
    assert with_layer1["sif"]["score"] == plain["sif"]["score"]
